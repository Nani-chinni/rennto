const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/screens/auth/OwnerRegistrationScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Location
content = content.replace(/<Text style=\{\[styles\.label, \{ color: "#111827", fontWeight: "600" \}\]\}>Location <Text style=\{\{ color: "#EF4444" \}\}>\*<\/Text><\/Text>/g, '<Text onLayout={onLayoutField(\'location\')} style={[styles.label, { color: "#111827", fontWeight: "600" }]}>Location <Text style={{ color: "#EF4444" }}>*</Text></Text>');

content = content.replace(/<Text style=\{styles\.label\}>\{t\("location"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'location\')} style={styles.label}>{t("location")}</Text>');

// Rent
content = content.replace(/<Text style=\{styles\.label\}>Basic Rent \/ Basic Property Amount<\/Text>/g, '<Text onLayout={onLayoutField(\'rent\')} style={styles.label}>Basic Rent / Basic Property Amount</Text>');

// Gallery
content = content.replace(/<Text style=\{\{ fontSize: 16, fontWeight: "700", color: "#111827" \}\}>Property Gallery<\/Text>/g, '<Text onLayout={onLayoutField(\'document_homePics\')} style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Property Gallery</Text>');

// Cover Image
content = content.replace(/<Text style=\{\{ fontSize: 16, fontWeight: "700", color: "#111827" \}\}>Cover Image<\/Text>/g, '<Text onLayout={onLayoutField(\'document_coverImage\')} style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Cover Image</Text>');

// Usage
content = content.replace(/<Text style=\{styles\.label\}>\{t\("usage"\)\}<\/Text>/g, '<Text onLayout={onLayoutField(\'usage\')} style={styles.label}>{t("usage")}</Text>');


fs.writeFileSync(filePath, content);
console.log('Done replacing part 2 fields in OwnerRegistrationScreen.js');
