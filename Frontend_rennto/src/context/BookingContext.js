import React, { createContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from '../utils/LanguageContext';
import BASE_URL, { fetchWithAuth } from "../config/Api";
import { removeCache } from "../utils/CacheHelper";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

export const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [requests, setRequests] = useState([]);
  const [userPhone, setuserPhone] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [seenIds, setSeenIds] = useState([]);
  const [clearedIds, setClearedIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mockRequests, setMockRequests] = useState([]); // Mock data state
  const ws = useRef(null);
  // Guards against a slow unread-count reply landing after the user changed.
  const unreadRequestSeq = useRef(0);
  const userPhoneRef = useRef(null);

  const player = useAudioPlayer(require("../../assets/notification.wav"));

  async function playSound() {
    try {
      if (player) {
        player.play();
      }
    } catch (error) {
      // error playing sound
    }
  }

  const [isJoined, setIsJoined] = useState(false);
  const [isTenantVacated, setIsTenantVacated] = useState(false);
  const [tenantStatus, setTenantStatus] = useState("");
  const [joinedProperty, setJoinedProperty] = useState(null);
  const [tenantProfile, setTenantProfile] = useState(null);

  useEffect(() => {
    userPhoneRef.current = userPhone;
  }, [userPhone]);

  // Read identity helper function
  const readIdentity = async () => {
    try {
      const tenant = await AsyncStorage.getItem("tenantPhone");
      let owner = await AsyncStorage.getItem("selectedAccountId");
      if (!owner) {
        owner = await AsyncStorage.getItem("ownerPhone");
      }
      const role = await AsyncStorage.getItem("userRole");
      return {
        role: role || null,
        phone: (role === "owner" ? owner || tenant : tenant || owner) || null,
      };
    } catch (e) {
      return { role: null, phone: null };
    }
  };

  // Dedicated Unread Notification Count Fetcher (Single Source of Truth)
  const fetchUnreadCount = useCallback(async (phoneOverride, roleOverride) => {
    let phone = phoneOverride || userPhone;
    let role = roleOverride || userRole;

    if (!phone) {
      const identity = await readIdentity();
      phone = identity.phone;
      role = role || identity.role;
      if (phone && phone !== userPhone) {
        setuserPhone(phone);
      }
      if (role && role !== userRole) {
        setUserRole(role);
      }
    }

    if (!phone) {
      return;
    }

    const phoneAtRequest = phone;
    const seq = ++unreadRequestSeq.current;
    try {
      const roleParam = role ? `&role=${encodeURIComponent(role)}` : "";
      const res = await fetchWithAuth(
        `${BASE_URL}/api/notifications/unread-count/?phone=${encodeURIComponent(phone)}${roleParam}`,
        { noCache: true }
      );
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (typeof data?.unread_count !== "number") return;
      if (seq !== unreadRequestSeq.current) return;
      if (phoneAtRequest !== userPhoneRef.current && phoneAtRequest !== phone) return;

      const count = Math.max(0, data.unread_count);
      setUnreadNotificationCount((prev) => (prev !== count ? count : prev));
    } catch (e) {
      // Safe fallback - keep last known count
    }
  }, [userPhone, userRole]);

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/notifications/${notificationId}/read/`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchUnreadCount();
      }
    } catch (e) {
      console.log("Error marking notification read:", e);
    }
  }, [fetchUnreadCount]);

  const markAllNotificationsRead = useCallback(async () => {
    const identity = await readIdentity();
    const phone = userPhone || identity.phone;
    const role = userRole || identity.role;

    if (!phone) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const roleParam = role ? `?role=${encodeURIComponent(role)}` : "";
      const res = await fetchWithAuth(`${BASE_URL}/api/notifications/${encodeURIComponent(phone)}/mark-all-read/${roleParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const count = typeof data?.unread_count === "number" ? Math.max(0, data.unread_count) : 0;
        setUnreadNotificationCount(count);
      }
    } catch (e) {
      console.log("Error marking all notifications read:", e);
    }
  }, [userPhone, userRole]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const { phone: activePhone, role } = await readIdentity();
        const storedSeen = await AsyncStorage.getItem("notificationSeenIds");
        const storedCleared = await AsyncStorage.getItem("notificationClearedIds");

        if (isMounted) {
          if (activePhone && activePhone !== userPhone) {
            setuserPhone(activePhone);
          }
          if (role && role !== userRole) {
            setUserRole(role);
          }
          if (storedSeen) setSeenIds(JSON.parse(storedSeen));
          if (storedCleared) setClearedIds(JSON.parse(storedCleared));
          if (activePhone) {
            fetchUnreadCount(activePhone, role);
          }
        }
      } catch (e) {
        console.log("Error loading context data:", e);
      }
    };
    loadData();

    const identityInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const { phone: nextPhone, role: nextRole } = await readIdentity();
        if (nextPhone === userPhone && nextRole === userRole) return;

        // Reset badge count on identity change so previous user count never bleeds over
        setUnreadNotificationCount(0);
        unreadRequestSeq.current += 1;
        if (userPhone) {
          const roleParam = userRole ? `&role=${encodeURIComponent(userRole)}` : "";
          removeCache(
            `${BASE_URL}/api/notifications/unread-count/?phone=${encodeURIComponent(userPhone)}${roleParam}`
          ).catch(() => {});
        }

        setuserPhone(nextPhone);
        setUserRole(nextRole);

        if (!nextPhone) {
          setRequests([]);
          setIsTenantVacated(false);
          setTenantStatus("");
          setIsJoined(false);
          setJoinedProperty(null);
          setTenantProfile(null);
        } else {
          fetchUnreadCount(nextPhone, nextRole);
        }
      } catch (e) {
        console.log("Error checking identity:", e);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(identityInterval);
    };
  }, [userPhone, userRole, fetchUnreadCount]);

  // --- VACATE CLEANUP ------------------------------------------------------
  // /api/tenantdetails/ returns the property's fields flattened onto the tenant
  // record, so the cover image rides along with the tenant profile. These are
  // the property's fields, not the tenant's -- once the owner approves a vacate
  // they have to be dropped locally. Nothing is deleted on the server.
  const stripPropertyFields = (profile) => {
    if (!profile || typeof profile !== "object") return profile;
    const {
      property_image, cover_image, property_photo, image, images, gallery,
      property_name, property_type, property_id, propertyDetails,
      location, address,
      floor, floor_no, room, room_no, bed, bed_no,
      owner, owner_id, owner_phone, ownerPhone,
      rent, checkIn, check_in, check_in_date, joining_date,
      next_due_date, due_date, rent_due_date,
      ...tenantOnly
    } = profile;
    return tenantOnly;
  };

  // Drops the tenant's active property from state AND from the offline GET
  // cache. apiFetch stores every successful GET under `cache_<url>`, so without
  // this purge an offline or failed refetch re-serves the old property -- cover
  // image included -- and the tenant looks joined again after an app restart.
  const clearTenantPropertyState = useCallback(async (phoneOverride) => {
    setJoinedProperty(null);
    setIsJoined(false);
    setIsTenantVacated(true);
    setTenantStatus("");
    setTenantProfile((prev) => stripPropertyFields(prev));

    let phone = phoneOverride || userPhone;
    if (!phone) {
      try {
        phone = await AsyncStorage.getItem("tenantPhone");
      } catch (e) {}
    }
    if (!phone) return;

    const encoded = encodeURIComponent(phone);
    await Promise.all([
      removeCache(`${BASE_URL}/api/tenantdetails/${encoded}/`),
      removeCache(`${BASE_URL}/api/vacate/requests/?tenant_phone=${encoded}`),
    ]);
  }, [userPhone]);

  // 1.5. Fetch Initial Requests & Sync
  const fetchRequests = useCallback(async () => {
    let phone = userPhone;
    let role = userRole;
    if (!phone) {
      const tenant = await AsyncStorage.getItem("tenantPhone");
      let owner = await AsyncStorage.getItem("selectedAccountId");
      if (!owner) {
        owner = await AsyncStorage.getItem("ownerPhone");
      }
      role = role || (await AsyncStorage.getItem("userRole"));
      phone = role === "owner" ? (owner || tenant) : (tenant || owner);
      if (phone) {
        setuserPhone(phone);
        if (role) setUserRole(role);
      }
    }
    if (!phone) return;

    try {
      const isOwner = role === 'owner';
      const endpoint = isOwner ? "owner_requests" : "tenant_notifications";

      const response = await fetchWithAuth(
        `${BASE_URL}/api/${endpoint}/${encodeURIComponent(phone)}/`
      );

      const data = await response.json();

      if (Array.isArray(data)) {
        setRequests((prev) => {
          try {
            if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          } catch (e) {}
          return data;
        });
      }

      if (!isOwner) {
        const detailsRes = await fetchWithAuth(
          `${BASE_URL}/api/tenantdetails/${encodeURIComponent(phone)}/`
        );
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          const isVac = Boolean(
            !detailsData || detailsData.is_vacant || detailsData.status === "Vacated" || detailsData.property_name === "N/A" || !detailsData.property_name
          );
          setIsTenantVacated(isVac);
          setTenantStatus(detailsData?.status || "");
          if (isVac) {
            // Owner approved the vacate (or the tenant is otherwise not in a
            // property): drop the active property and its cover image, and purge
            // the cached response so it cannot come back on the next launch.
            setTenantProfile(stripPropertyFields(detailsData) || null);
            setJoinedProperty(null);
            setIsJoined(false);
            await clearTenantPropertyState(phone);
          } else {
            setTenantProfile(detailsData || null);
            setJoinedProperty(detailsData);
            setIsJoined(true);
          }
        }
      } else {
        setIsTenantVacated(false);
        setTenantStatus("");
        setJoinedProperty(null);
        setIsJoined(false);
      }
    } catch (error) {
      console.log("Fetch Requests Error:", error);
    }
  }, [userPhone, userRole]);

  useEffect(() => {
    const isAadhaarUploaded = Boolean(
      tenantProfile?.aadhar_id &&
      tenantProfile.aadhar_id !== "N/A" &&
      tenantProfile.aadhar_id !== ""
    );

    if (isTenantVacated || !joinedProperty || joinedProperty.property_name === "N/A" || !joinedProperty.property_name || joinedProperty.is_vacant || joinedProperty.status === "Vacated") {
      setIsJoined(false);
    } else if (tenantStatus === "Active" && !joinedProperty.is_vacant && isAadhaarUploaded) {
      setIsJoined(true);
    } else {
      setIsJoined(false);
    }
  }, [isTenantVacated, tenantStatus, joinedProperty, tenantProfile]);

  useEffect(() => {
    fetchRequests();
    fetchUnreadCount();
  }, [userPhone, refreshTrigger, fetchUnreadCount]);

  // Poll unread count only — do not bump refreshTrigger on a timer (that re-renders the whole app).
  useEffect(() => {
    if (!userPhone) return;
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 15000);
    return () => clearInterval(interval);
  }, [userPhone, fetchUnreadCount]);

  // The one foreground listener for the whole app. Anything that arrived while
  // the app was backgrounded is reconciled from the backend here instead of
  // being guessed at from a local counter.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchUnreadCount();
      }
    });
    return () => subscription.remove();
  }, [fetchUnreadCount]);

  // 2. WebSocket Connection Management
  useEffect(() => {
    if (!userPhone) return;

    const sanitizedPhone = userPhone
      .replace('+', '')
      .replace('@', '_')
      .replace('.', '_');

    const isTenant = userRole === "tenant";
    const wsUrl = isTenant
      ? `${BASE_URL.replace(/^http/, "ws")}/ws/tenant-notifications/${sanitizedPhone}/`
      : `${BASE_URL.replace(/^http/, "ws")}/ws/notifications/${sanitizedPhone}/`;

    let cancelled = false;
    let reconnectTimer = null;

    const connectWS = () => {
      if (cancelled) return;
      try {
        ws.current?.close();
      } catch (e) {}

      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          if (cancelled) return;
          fetchUnreadCount(userPhone, userRole);
        };

        ws.current.onmessage = async (e) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(e.data);
            const msgText = data.content?.message || data.message;

            // Owner approved the vacate: clear the active property (and its cover
            // image) right away, before the refetch below re-renders the screen.
            const eventType = String(
              data.type || data.event || data.content?.type || ""
            ).toLowerCase();
            if (
              eventType === "tenant_removed" ||
              eventType === "tenant_vacated" ||
              eventType === "vacate_approved" ||
              eventType === "vacate_accepted"
            ) {
              await clearTenantPropertyState();
            }

            fetchUnreadCount(userPhone, userRole);
            setRefreshTrigger((prev) => prev + 1);

            if (msgText) {
              playSound();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Popup removed: badge count + sound/haptic still notify the user.
            }
          } catch (err) {
            console.log("WS Message Error:", err);
          }
        };

        ws.current.onclose = () => {
          if (cancelled) return;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectWS, 4000);
        };

        ws.current.onerror = () => {
          if (cancelled) return;
          try {
            ws.current?.close();
          } catch (e) {}
        };
      } catch (err) {
        if (!cancelled) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectWS, 4000);
        }
      }
    };
    connectWS();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws.current?.close();
      } catch (e) {}
    };
  }, [userPhone, userRole, fetchUnreadCount, clearTenantPropertyState]);

  // Handle Marking As Seen
  const markAllAsSeen = async () => {
    const newIds = requests.map((r) => r.id);
    const uniqueIds = Array.from(new Set([...seenIds, ...newIds]));
    setSeenIds(uniqueIds);
    try {
      await AsyncStorage.setItem("notificationSeenIds", JSON.stringify(uniqueIds));
    } catch (e) {
      console.log("Error saving seenIds:", e);
    }
  };

  // Handle Clearing All Notifications
  const clearAllNotifications = async (items = []) => {
    const targetItems = Array.isArray(items) && items.length > 0 ? items : requests;
    const newIds = targetItems.map((r) => r.id);
    const uniqueIds = Array.from(new Set([...clearedIds, ...newIds]));
    setClearedIds(uniqueIds);
    setUnreadNotificationCount(0);
    try {
      await AsyncStorage.setItem("notificationClearedIds", JSON.stringify(uniqueIds));
      if (userPhone) {
        await markAllNotificationsRead();
      }
    } catch (e) {
      console.log("Error clearing notifications:", e);
    }
  };

  // Refined Pending Count
  const pendingCount = requests.filter((r) => {
    if (clearedIds.includes(r.id)) return false;

    const isUnseen = !seenIds.includes(r.id);
    const status = (r.status || "").toLowerCase();

    // 1. Join Request Logic
    if (r.type === "join_request" || r.type === "JOIN_REQUEST" || !r.type) {
      const isOwnerTask = ["pending", "allotted"].includes(status);
      const isTenantAlert = ["accepted", "rejected"].includes(status);
      
      if (userRole === "owner") {
        return isUnseen && isOwnerTask;
      }
      if (userRole === "tenant") {
        return isUnseen && isTenantAlert;
      }
      return isUnseen && (isOwnerTask || isTenantAlert);
    }

    // 2. Issue Logic
    if (r.type === "issue") {
      return isUnseen;
    }

    // 3. Payment Logic
    if (r.type === "payment") {
      return isUnseen;
    }

    return isUnseen;
  }).length;

  // --- MOCK REQUEST HANDLERS ---
  const submitOwnerRequest = (requestData) => {
    const newReq = {
      ...requestData,
      id: "mock_" + Date.now(),
      created_at: new Date().toISOString(),
      status: "pending",
      is_mock: true
    };
    setMockRequests(prev => [newReq, ...prev]);
    Alert.alert("Success", "Request Sent to Owner!");
  };

  const updateOwnerRequestStatus = (id, newStatus) => {
    setMockRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: newStatus } : req
    ));
    setRefreshTrigger(prev => prev + 1);
  };

  const combinedRequests = useMemo(() => {
    return [...requests, ...mockRequests];
  }, [requests, mockRequests]);

  const contextValue = useMemo(() => ({
    requests: combinedRequests,
    setRequests,
    fetchRequests,
    clearTenantPropertyState,
    isJoined,
    joinedProperty,
    tenantProfile,
    pendingCount,
    unreadNotificationCount,
    setUnreadNotificationCount,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    userPhone,
    setuserPhone,
    userRole,
    setUserRole,
    refreshTrigger,
    setRefreshTrigger,
    markAllAsSeen,
    clearAllNotifications,
    clearedIds,
    submitOwnerRequest,
    updateOwnerRequestStatus
  }), [
    combinedRequests,
    fetchRequests,
    clearTenantPropertyState,
    isJoined,
    joinedProperty,
    tenantProfile,
    pendingCount,
    unreadNotificationCount,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    userPhone,
    userRole,
    refreshTrigger,
    seenIds,
    clearedIds
  ]);

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  );
};