const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/screens/auth/OwnerRegistrationScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  { search: `Owner Full Name <Text style={{ color: "#EF4444" }}>*</Text>`, replace: `<Text onLayout={onLayoutField('name')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                          Owner Full Name <Text style={{ color: "#EF4444" }}>*</Text>` },
  { search: `Identity Proof Type <Text style={{ color: "#EF4444" }}>*</Text>`, replace: `<Text onLayout={onLayoutField('idProofType')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                          Identity Proof Type <Text style={{ color: "#EF4444" }}>*</Text>` },
  { search: `Stay Type <Text style={{ color: "#EF4444" }}>*</Text>`, replace: `<Text onLayout={onLayoutField('stayType')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                          Stay Type <Text style={{ color: "#EF4444" }}>*</Text>` },
  { search: `<Text style={styles.label}>{t("hostel_name")}</Text>`, replace: `<Text onLayout={onLayoutField('hostelName')} style={styles.label}>{t("hostel_name")}</Text>` },
  { search: `<Text style={styles.label}>{t("apartment_name")}</Text>`, replace: `<Text onLayout={onLayoutField('apartmentName')} style={styles.label}>{t("apartment_name")}</Text>` },
  { search: `<Text style={styles.label}>{t("property_name")}</Text>`, replace: `<Text onLayout={onLayoutField('commercialName')} style={styles.label}>{t("property_name")}</Text>` },
  { search: `Search Property Location <Text style={{ color: "#EF4444" }}>*</Text>`, replace: `<Text onLayout={onLayoutField('location')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Search Property Location <Text style={{ color: "#EF4444" }}>*</Text>` },
  { search: `<Text style={styles.label}>{t("hostel_type")}</Text>`, replace: `<Text onLayout={onLayoutField('hostelType')} style={styles.label}>{t("hostel_type")}</Text>` },
  { search: `<Text style={styles.label}>{t("tenant_type")}</Text>`, replace: `<Text onLayout={onLayoutField('tenantType')} style={styles.label}>{t("tenant_type")}</Text>` },
  { search: `<Text style={styles.label}>{t("usage_type")}</Text>`, replace: `<Text onLayout={onLayoutField('usage')} style={styles.label}>{t("usage_type")}</Text>` },
  { search: `<Text style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Property Images`, replace: `<Text onLayout={onLayoutField('document_homePics')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Property Images` },
  { search: `<Text style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Cover Image`, replace: `<Text onLayout={onLayoutField('document_coverImage')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Cover Image` },
  { search: `<Text style={styles.label}>{t("facilities_available")}</Text>`, replace: `<Text onLayout={onLayoutField('facilities')} style={styles.label}>{t("facilities_available")}</Text>` },
  { search: `<Text style={[styles.label, { marginBottom: 4 }]}>\n                              Rent (Per Month)`, replace: `<Text onLayout={onLayoutField('rent')} style={[styles.label, { marginBottom: 4 }]}>\n                              Rent (Per Month)` },
  { search: `<Text style={styles.label}>Furnishing Type</Text>`, replace: `<Text onLayout={onLayoutField('furnishingType')} style={styles.label}>Furnishing Type</Text>` }
];

for (const rep of replacements) {
  // Use regex to match the original line carefully or just simple string replacement
  const startStr = content.indexOf(rep.search.split('<Text')[0]);
  if (content.includes(rep.search)) {
    // If it's just a simple string replacement, we have to make sure we replace the enclosing <Text> too.
    // Notice I changed `replacements` structure to just replace the whole text node where possible.
  }
}

// Actually let's use regex for safer replacement.
content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>\s*Owner Full Name/g, '<Text onLayout={onLayoutField(\'name\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                          Owner Full Name');

content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>\s*Identity Proof Type/g, '<Text onLayout={onLayoutField(\'idProofType\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                          Identity Proof Type');

content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>\s*Stay Type/g, '<Text onLayout={onLayoutField(\'stayType\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                          Stay Type');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("hostel_name"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'hostelName\')} style={styles.label}>{t("hostel_name")}</Text>');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("apartment_name"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'apartmentName\')} style={styles.label}>{t("apartment_name")}</Text>');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("property_name"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'commercialName\')} style={styles.label}>{t("property_name")}</Text>');

content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>\s*Search Property Location/g, '<Text onLayout={onLayoutField(\'location\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Search Property Location');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("hostel_type"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'hostelType\')} style={styles.label}>{t("hostel_type")}</Text>');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("tenant_type"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'tenantType\')} style={styles.label}>{t("tenant_type")}</Text>');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("usage_type"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'usage\')} style={styles.label}>{t("usage_type")}</Text>');

content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>\s*Property Images/g, '<Text onLayout={onLayoutField(\'document_homePics\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Property Images');

content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>\s*Cover Image/g, '<Text onLayout={onLayoutField(\'document_coverImage\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>\n                            Cover Image');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("facilities_available"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'facilities\')} style={styles.label}>{t("facilities_available")}</Text>');

content = content.replace(/<Text style=\{\[styles\.label, \{ marginBottom: 4 \}\]\}>\s*Rent \(Per Month\)/g, '<Text onLayout={onLayoutField(\'rent\')} style={[styles.label, { marginBottom: 4 }]}>\n                              Rent (Per Month)');

content = content.replace(/<Text style=\{styles\.label\}>Furnishing Type<\/Text>/g, '<Text onLayout={onLayoutField(\'furnishingType\')} style={styles.label}>Furnishing Type</Text>');

fs.writeFileSync(filePath, content);
console.log('Done replacing fields in OwnerRegistrationScreen.js');
