UPDATE categories SET name_ml = 'പ്ലംബിംഗ്', description_ml = 'കേടായ വെള്ള പൈപ്പുകൾ അറ്റകുറ്റപ്പണി ചെയ്യുക' WHERE name = 'Plumbing';
UPDATE categories SET name_ml = 'ക്ലീനിംഗ്', description_ml = 'വീടും പരിസരവും വൃത്തിയാക്കൽ' WHERE name = 'Cleaning';
UPDATE subcategories SET name_ml = 'പൈപ്പ് അറ്റകുറ്റപ്പണി', category_name_ml = 'പ്ലംബിംഗ്' WHERE name = 'Pipe Leak Repair';
UPDATE subcategories SET name_ml = 'വീട് മുഴുവൻ ക്ലീനിംഗ്', category_name_ml = 'ക്ലീനിംഗ്' WHERE name = 'Full Home Cleaning';
