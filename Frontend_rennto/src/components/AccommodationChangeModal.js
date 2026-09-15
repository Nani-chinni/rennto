import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Accommodation change request modal (My Stay -> Change Floor / Room / Bed).
 *
 * The options here MUST come from the owner's real building layout
 * (GET /api/details/<owner_id>/). The backend accepts a request by allocating
 * a specific unit inside that layout, so a floor/room/bed the owner does not
 * actually have fails on approval. `changeType` therefore only decides the
 * wording: a valid request always names a COMPLETE destination, because a
 * complete destination is what gets allocated.
 *
 * Layout shapes returned by the API:
 *   hostel:     [{ floorNo, rooms:    [{ roomNo, beds: [{bedNumber, isOccupied}] | <int> }] }]
 *   apartment:  [{ floorNo, flats:    [{ flatNo, isOccupied }] }]
 *   commercial: [{ floorNo, sections: [{ sectionNo, isOccupied }] }]
 */
export default function AccommodationChangeModal({
  visible,
  onClose,
  onSubmit,
  changeType, // "FLOOR", "ROOM", "BED"
  currentAllocation = {},
  buildingLayout = [],
  propertyType = "hostel",
  loadingLayout = false,
}) {
  const type = String(propertyType || "hostel").toLowerCase();
  const isHostel = type === "hostel";
  const isApartment = type === "apartment";

  const currentFloor = currentAllocation?.floor ?? "";
  const currentRoom = currentAllocation?.room ?? "";
  const currentBed = currentAllocation?.bed ?? "";

  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showBedDropdown, setShowBedDropdown] = useState(false);

  const layout = Array.isArray(buildingLayout) ? buildingLayout : [];

  // Second-level unit: rooms for a hostel, flats for an apartment,
  // sections for a commercial property.
  const unitKey = isHostel ? "rooms" : isApartment ? "flats" : "sections";
  const unitIdKey = isHostel ? "roomNo" : isApartment ? "flatNo" : "sectionNo";
  const unitLabel = isHostel ? "Room" : isApartment ? "Flat" : "Section";

  const digits = (v) => (v == null ? "" : String(v).replace(/[^0-9]/g, ""));

  const floorOptions = useMemo(
    () =>
      layout
        .map((f) => String(f?.floorNo))
        .filter((v) => v && v !== "undefined" && v !== "null"),
    [layout]
  );

  const currentFloorObj = useMemo(
    () => layout.find((f) => String(f?.floorNo) === String(selectedFloor)) || null,
    [layout, selectedFloor]
  );

  const unitOptions = useMemo(() => {
    const units = currentFloorObj?.[unitKey];
    if (!Array.isArray(units)) return [];
    return units.map((u) => ({
      id: String(u?.[unitIdKey]),
      isOccupied: !!u?.isOccupied,
      raw: u,
    }));
  }, [currentFloorObj, unitKey, unitIdKey]);

  const selectedUnitObj = useMemo(
    () => unitOptions.find((u) => u.id === String(selectedUnit))?.raw || null,
    [unitOptions, selectedUnit]
  );

  // Beds exist only for hostels. `beds` may be a list of objects or a plain
  // count, so normalise both into one shape.
  const bedOptions = useMemo(() => {
    if (!isHostel || !selectedUnitObj) return [];
    const beds = selectedUnitObj.beds;
    if (typeof beds === "number") {
      return Array.from({ length: beds }, (_, i) => ({
        id: String(i + 1),
        isOccupied: false,
      }));
    }
    if (!Array.isArray(beds)) return [];
    return beds.map((b) => ({
      id: String(b?.bedNumber),
      isOccupied: !!b?.isOccupied,
    }));
  }, [isHostel, selectedUnitObj]);

  // The tenant's own bed is already theirs, so it must not read as unavailable.
  const isOwnBed = (bedId) =>
    digits(currentFloor) === digits(selectedFloor) &&
    digits(currentRoom) === digits(selectedUnit) &&
    digits(currentBed) === digits(bedId);

  const prevVisibleRef = React.useRef(false);

  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (justOpened) {
      setReason("");
      setError("");
      setShowFloorDropdown(false);
      setShowUnitDropdown(false);
      setShowBedDropdown(false);
      // Start on the tenant's current floor when the layout has it, otherwise on
      // the first floor the owner actually has.
      const match = layout.find((f) => digits(f?.floorNo) === digits(currentFloor));
      setSelectedFloor(
        match ? String(match.floorNo) : String(layout[0]?.floorNo ?? "")
      );
      setSelectedUnit("");
      setSelectedBed("");
    }
  }, [visible, changeType]);

  // If layout was loading when modal opened and arrives later, initialize selected floor if not already set
  useEffect(() => {
    if (visible && !selectedFloor && layout.length > 0) {
      const match = layout.find((f) => digits(f?.floorNo) === digits(currentFloor));
      setSelectedFloor(
        match ? String(match.floorNo) : String(layout[0]?.floorNo ?? "")
      );
    }
  }, [visible, layout, selectedFloor, currentFloor]);

  const pickFloor = (value) => {
    setSelectedFloor(value);
    setSelectedUnit("");
    setSelectedBed("");
    setShowFloorDropdown(false);
    setError("");
  };

  const pickUnit = (value) => {
    setSelectedUnit(value);
    setSelectedBed("");
    setShowUnitDropdown(false);
    setError("");
  };

  const pickBed = (value) => {
    setSelectedBed(value);
    setShowBedDropdown(false);
    setError("");
  };

  const getTitle = () => {
    switch (changeType) {
      case "FLOOR":
        return "Change Floor";
      case "ROOM":
        return `Change ${unitLabel}`;
      case "BED":
        return "Change Bed";
      default:
        return "Request Accommodation Change";
    }
  };

  const handleSubmit = () => {
    if (loadingLayout || !layout.length) {
      setError(
        "Your property layout is still loading. Please try again in a moment."
      );
      return;
    }
    if (!selectedFloor) {
      setError("Please choose a floor.");
      return;
    }
    if (!selectedUnit) {
      setError(`Please choose a ${unitLabel.toLowerCase()}.`);
      return;
    }
    if (isHostel && !selectedBed) {
      setError("Please choose a bed.");
      return;
    }

    onSubmit({
      changeType,
      propertyType: type,
      currentFloor,
      currentRoom,
      currentBed,
      // Always a complete destination -- this is what the owner allocates.
      requestedFloor: selectedFloor,
      requestedRoom: isHostel ? selectedUnit : "",
      requestedBed: isHostel ? selectedBed : "",
      requestedFlat: isApartment ? selectedUnit : "",
      requestedSection: !isHostel && !isApartment ? selectedUnit : "",
      reason: reason.trim(),
    });
    onClose();
  };

  const renderOption = ({ key, label, disabled, selected, onPress }) => (
    <TouchableOpacity
      key={key}
      disabled={disabled}
      style={[
        styles.dropdownItem,
        selected && styles.dropdownItemActive,
        disabled && styles.dropdownItemDisabled,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dropdownItemText,
          selected && styles.dropdownItemTextActive,
        ]}
      >
        {label}
      </Text>
      {disabled ? (
        <Text style={styles.occupiedTag}>Occupied</Text>
      ) : selected ? (
        <Ionicons name="checkmark" size={16} color="#7C3AED" />
      ) : null}
    </TouchableOpacity>
  );

  const renderDropdown = ({
    label,
    placeholder,
    value,
    open,
    setOpen,
    options,
    emptyText,
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        activeOpacity={0.8}
        onPress={() => setOpen((prev) => !prev)}
      >
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownMenu}>
          {options.length === 0 ? (
            <View style={styles.dropdownItem}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : (
            options.map(renderOption)
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.container}>
                {/* Header Close Bar */}
                <View style={styles.headerRow}>
                  <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#1F2937" />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>{getTitle()}</Text>
                  <View style={{ width: 24 }} />
                </View>

                <ScrollView
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets={true}
                  scrollEventThrottle={16}
                  decelerationRate={Platform.OS === "ios" ? "normal" : 0.985}
                  overScrollMode="never"
                  bounces={true}
                  nestedScrollEnabled={true}
                >
                  {/* Current Details Summary Card */}
                  <View style={styles.currentDetailsCard}>
                    <Text style={styles.cardSectionTitle}>Current Details</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Floor</Text>
                      <Text style={styles.detailValue}>{currentFloor || "—"}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{unitLabel}</Text>
                      <Text style={styles.detailValue}>{currentRoom || "—"}</Text>
                    </View>

                    {isHostel && (
                      <>
                        <View style={styles.divider} />
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Bed</Text>
                          <Text style={styles.detailValue}>{currentBed || "—"}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  <Text style={styles.sectionHeader}>Select New Allocation</Text>
                  <Text style={styles.helperText}>
                    Pick the exact place you want to move to. Your owner approves
                    this allocation directly, so all fields are required.
                  </Text>

                  {loadingLayout ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                      <Text style={styles.loadingText}>
                        Loading your property layout…
                      </Text>
                    </View>
                  ) : layout.length === 0 ? (
                    <View style={styles.loadingBox}>
                      <Text style={styles.emptyText}>
                        We could not load your property layout. Please close this
                        and try again.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {renderDropdown({
                        label: "Floor",
                        placeholder: "Select a floor",
                        value: selectedFloor ? `Floor ${selectedFloor}` : "",
                        open: showFloorDropdown,
                        setOpen: setShowFloorDropdown,
                        emptyText: "This property has no floors configured.",
                        options: floorOptions.map((opt) => ({
                          key: `floor-${opt}`,
                          label: `Floor ${opt}`,
                          disabled: false,
                          selected: String(selectedFloor) === opt,
                          onPress: () => pickFloor(opt),
                        })),
                      })}

                      {renderDropdown({
                        label: unitLabel,
                        placeholder: `Select a ${unitLabel.toLowerCase()}`,
                        value: selectedUnit ? `${unitLabel} ${selectedUnit}` : "",
                        open: showUnitDropdown,
                        setOpen: setShowUnitDropdown,
                        emptyText: `No ${unitLabel.toLowerCase()}s on this floor.`,
                        options: unitOptions.map((u) => ({
                          key: `unit-${u.id}`,
                          label: `${unitLabel} ${u.id}`,
                          // For hostels a room stays selectable even when some
                          // beds are taken; the bed list shows what is free.
                          disabled: isHostel ? false : u.isOccupied,
                          selected: String(selectedUnit) === u.id,
                          onPress: () => pickUnit(u.id),
                        })),
                      })}

                      {isHostel &&
                        renderDropdown({
                          label: "Bed",
                          placeholder: selectedUnit
                            ? "Select a bed"
                            : `Choose a ${unitLabel.toLowerCase()} first`,
                          value: selectedBed ? `Bed ${selectedBed}` : "",
                          open: showBedDropdown,
                          setOpen: setShowBedDropdown,
                          emptyText: selectedUnit
                            ? "No beds configured in this room."
                            : `Choose a ${unitLabel.toLowerCase()} first.`,
                          options: bedOptions.map((b) => ({
                            key: `bed-${b.id}`,
                            label: `Bed ${b.id}`,
                            disabled: b.isOccupied && !isOwnBed(b.id),
                            selected: String(selectedBed) === b.id,
                            onPress: () => pickBed(b.id),
                          })),
                        })}
                    </>
                  )}

                  {/* Reason Field */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Reason (Optional)</Text>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="I want to change due to personal preference."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      value={reason}
                      onChangeText={setReason}
                    />
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      (loadingLayout || layout.length === 0) &&
                      styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                    disabled={loadingLayout || layout.length === 0}
                  >
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  currentDetailsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13.5,
    color: "#4B5563",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12.5,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 14,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  fieldGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "600",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemDisabled: {
    opacity: 0.45,
  },
  dropdownItemActive: {
    backgroundColor: "#F3E8FF",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  dropdownItemTextActive: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  occupiedTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "700",
    marginBottom: 10,
  },
  reasonInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#1F2937",
    minHeight: 70,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: "#C4B5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
