import React, { useState, useContext } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  TextInput 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useLanguage } from "../../utils/LanguageContext";
import COLORS from "../../theme/colors";
import BASE_URL, { fetchWithAuth } from "../../config/Api";
import { BookingContext } from "../../context/BookingContext";

export default function TenantVerificationScreen({ navigation }) {
  const { t } = useLanguage();
  const { setRefreshTrigger } = useContext(BookingContext);

  const [aadharId, setAadharId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedBackFile, setSelectedBackFile] = useState(null);
  const [selectedPaymentScreenshot, setSelectedPaymentScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePickDocument = async (type) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "image/*",
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        if (type === "front") setSelectedFile(asset);
        else if (type === "back") setSelectedBackFile(asset);
        else if (type === "payment") setSelectedPaymentScreenshot(asset);
      }
    } catch (err) {
      console.log("Error picking document", err);
    }
  };

  const isSubmitDisabled = !aadharId || aadharId.length !== 12 || !selectedFile || uploading;

  const handleSubmit = async () => {
    try {
      setUploading(true);
      const tenantPhone = await AsyncStorage.getItem("tenantPhone");
      if (!tenantPhone) {
        Alert.alert("Error", "Tenant phone missing. Please login again.");
        return;
      }

      if (!aadharId || !selectedFile) {
        Alert.alert("Missing Information", "Please enter Aadhaar ID and upload Aadhaar Card Image.");
        return;
      }
      if (aadharId.length !== 12) {
        Alert.alert("Invalid Aadhaar", "Aadhaar ID must be exactly 12 numeric digits.");
        return;
      }

      const formData = new FormData();
      formData.append("phone", tenantPhone);
      formData.append("aadhar_id", aadharId);
      formData.append("aadhar_image", {
        uri: selectedFile.uri,
        name: selectedFile.name || "aadhar.jpg",
        type: selectedFile.mimeType || "image/jpeg"
      });
      
      if (selectedBackFile) {
        formData.append("aadhar_back_image", {
          uri: selectedBackFile.uri,
          name: selectedBackFile.name || "aadhar_back.jpg",
          type: selectedBackFile.mimeType || "image/jpeg"
        });
      }
      
      if (selectedPaymentScreenshot) {
        formData.append("payment_screenshot", {
          uri: selectedPaymentScreenshot.uri,
          name: selectedPaymentScreenshot.name || "payment_proof.jpg",
          type: selectedPaymentScreenshot.mimeType || "image/jpeg"
        });
      }

      const uploadRes = await fetchWithAuth(`${BASE_URL}/api/tenant/submit_verification/`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) {
        Alert.alert("Upload Failed", "Failed to upload proofs: " + (uploadData.error || "Unknown error"));
        return;
      }

      Alert.alert("Success", "Aadhaar details verified successfully!");
      if (setRefreshTrigger) {
        setRefreshTrigger(prev => prev + 1);
      }

    } catch (error) {
      console.log("Verification Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("verification_required") || "Verification Required"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.illustrationWrapper}>
          <View style={styles.iconGlow} />
          <View style={styles.mainIconCircle}>
            <MaterialCommunityIcons name="shield-check" size={70} color="#5F259F" />
          </View>
          <View style={styles.smallInfoBadge}>
            <Feather name="info" size={16} color="#D97706" />
          </View>
        </View>

        <Text style={styles.emptyTitle}>{t("complete_kyc") || "Complete KYC"}</Text>
        <Text style={styles.emptySub}>
          {t("upload_aadhaar_to_view") || "You must upload your Aadhaar details to unlock your property dashboard, report issues, and make payments."}
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>{t("aadhaar_id") || "Aadhaar ID *"}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("enter_aadhaar") || "Enter 12-digit Aadhaar ID"}
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={12}
            value={aadharId}
            onChangeText={(text) => setAadharId(text.replace(/[^0-9]/g, ''))}
          />

          <Text style={styles.label}>{t("aadhaar_image") || "Aadhaar Front Image *"}</Text>
          <TouchableOpacity
            onPress={() => handlePickDocument("front")}
            style={[styles.uploadBox, selectedFile && styles.uploadBoxSelected]}
          >
            {selectedFile ? (
              <Text style={styles.uploadTextSuccess} numberOfLines={1}>
                ✓ {selectedFile.name || "Front Image Selected"}
              </Text>
            ) : (
              <Text style={styles.uploadText}>{t("choose_aadhaar") || "Choose Aadhaar Front Image"}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>{t("aadhaar_back_image") || "Aadhaar Back Image (Optional)"}</Text>
          <TouchableOpacity
            onPress={() => handlePickDocument("back")}
            style={[styles.uploadBox, selectedBackFile && styles.uploadBoxSelected]}
          >
            {selectedBackFile ? (
              <Text style={styles.uploadTextSuccess} numberOfLines={1}>
                ✓ {selectedBackFile.name || "Back Image Selected"}
              </Text>
            ) : (
              <Text style={styles.uploadText}>{t("choose_aadhaar_back") || "Choose Aadhaar Back Image"}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>{t("payment_proof") || "Payment Proof (Optional)"}</Text>
          <TouchableOpacity
            onPress={() => handlePickDocument("payment")}
            style={[styles.uploadBox, selectedPaymentScreenshot && styles.uploadBoxSelected]}
          >
            {selectedPaymentScreenshot ? (
              <Text style={styles.uploadTextSuccess} numberOfLines={1}>
                ✓ {selectedPaymentScreenshot.name || "Payment Proof Selected"}
              </Text>
            ) : (
              <Text style={styles.uploadText}>{t("choose_payment_proof") || "Choose Payment Screenshot"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={isSubmitDisabled}
            onPress={handleSubmit}
            style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>{t("submit_verification") || "Submit Documents"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  illustrationWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3E8FF',
  },
  mainIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF'
  },
  smallInfoBadge: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    backgroundColor: '#FEF3C7',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1e293b",
  },
  uploadBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  uploadBoxSelected: {
    borderStyle: "solid",
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + "0A",
  },
  uploadText: {
    color: "#64748b",
    fontSize: 13
  },
  uploadTextSuccess: {
    color: COLORS.PRIMARY,
    fontWeight: "600",
    fontSize: 13
  },
  submitBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700"
  }
});
