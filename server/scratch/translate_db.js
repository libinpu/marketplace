const pool = require("../config/database");

const categoryTranslations = {
  'Cleaning': { name: 'ക്ലീനിംഗ്', desc: 'വീടും പരിസരവും വൃത്തിയാക്കൽ' },
  'Painting': { name: 'പെയിന്റിംഗ്', desc: 'വീടിനും കെട്ടിടങ്ങൾക്കും പെയിന്റ് അടിക്കൽ' },
  'Plumbing': { name: 'പ്ലംബിംഗ്', desc: 'പൈപ്പ്, വെള്ളം സംബന്ധമായ അറ്റകുറ്റപ്പണികൾ' },
  'Electrical': { name: 'ഇലക്ട്രിക്കൽ', desc: 'വൈദ്യുതി സംബന്ധമായ അറ്റകുറ്റപ്പണികൾ' },
  'AC & Appliance Repair': { name: 'എസി & ഉപകരണങ്ങൾ', desc: 'എസി, ഫ്രിഡ്ജ്, വാഷിംഗ് മെഷീൻ നന്നാക്കൽ' },
  'Carpentry': { name: 'മരപ്പണി', desc: 'ഫർണിച്ചർ നിർമ്മാണവും അറ്റകുറ്റപ്പണിയും' },
  'Gardening & Landscaping': { name: 'പൂന്തോട്ട നിർമ്മാണം', desc: 'പൂന്തോട്ടം ഒരുക്കലും പരിപാലനവും' },
  'CCTV & Security': { name: 'സിസിടിവി & സുരക്ഷ', desc: 'ക്യാമറ സ്ഥാപിക്കലും സുരക്ഷയും' },
  'Home Repair & Maintenance': { name: 'വീട് അറ്റകുറ്റപ്പണി', desc: 'പൊതുവായ അറ്റകുറ്റപ്പണികൾ' },
  'Photography & Videography': { name: 'ഫോട്ടോഗ്രാഫി', desc: 'ഫോട്ടോ, വീഡിയോ സേവനങ്ങൾ' },
  'Vehicle Services': { name: 'വാഹന സേവനങ്ങൾ', desc: 'വാഹനങ്ങളുടെ അറ്റകുറ്റപ്പണി' },
  'Personal Care': { name: 'വ്യക്തിഗത പരിചരണം', desc: 'സൗന്ദര്യ സംരക്ഷണവും മറ്റും' },
  'Barber and Beautician Services': { name: 'ബാർബർ & ബ്യൂട്ടീഷ്യൻ', desc: 'ബ്യൂട്ടി പാർലർ സേവനങ്ങൾ' }
};

const subcategoryTranslations = {
  'Home Cleaning': 'വീട് മുഴുവൻ ക്ലീനിംഗ്',
  'Deep Cleaning': 'ഡീപ്പ് ക്ലീനിംഗ്',
  'Bathroom Cleaning': 'ബാത്ത്റൂം ക്ലീനിംഗ്',
  'Interior Painting': 'ഇന്റീരിയർ പെയിന്റിംഗ്',
  'Exterior Painting': 'എക്സ്റ്റീരിയർ പെയിന്റിംഗ്',
  'Pipe Leak Repair': 'പൈപ്പ് അറ്റകുറ്റപ്പണി',
  'Tap Installation': 'ടാപ്പ് സ്ഥാപിക്കൽ',
  'Wiring': 'വയറിംഗ്',
  'Fan Installation': 'ഫാൻ സ്ഥാപിക്കൽ',
  'AC Service': 'എസി സർവീസ്',
  'AC Repair': 'എസി അറ്റകുറ്റപ്പണി',
  'Furniture Repair': 'ഫർണിച്ചർ നന്നാക്കൽ',
  'Door Installation': 'വാതിൽ സ്ഥാപിക്കൽ',
  'Grass Cutting': 'പുല്ല് വെട്ടൽ',
  'CCTV Installation': 'സിസിടിവി സ്ഥാപിക്കൽ',
  'Car Wash': 'കാർ വാഷ്'
};

async function translateDB() {
    try {
        console.log("Starting DB translation...");
        
        for (const [engName, mlData] of Object.entries(categoryTranslations)) {
            await pool.query(
                `UPDATE categories SET name_ml = $1, description_ml = $2 WHERE name = $3 OR name = $4`,
                [mlData.name, mlData.desc, engName, engName.toLowerCase()]
            );
        }
        console.log("Categories translated.");

        const subcatsRes = await pool.query(`SELECT id, name, category_name FROM subcategories`);
        for (const row of subcatsRes.rows) {
            let nameMl = subcategoryTranslations[row.name] || row.name; 
            let catNameMl = categoryTranslations[row.category_name]?.name || row.category_name;
            
            await pool.query(
                `UPDATE subcategories SET name_ml = $1, category_name_ml = $2 WHERE id = $3`,
                [nameMl, catNameMl, row.id]
            );
        }
        console.log("Subcategories translated.");
        
    } catch (err) {
        console.error("Translation failed:", err);
    } finally {
        pool.end();
    }
}

translateDB();
