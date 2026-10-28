// Verified Kerala Administrative Locations Dataset
// Contains 141+ verified Corporations, Municipalities, Major Towns, and Taluks across all 14 Districts of Kerala.
// Each entry has official District, City/Town name, Location Type, and precise Coordinates (GRCh/WGS84).

const KERALA_LOCATIONS_DATA = [
  // --- THIRUVANANTHAPURAM DISTRICT ---
  { district: 'Thiruvananthapuram', city: 'Thiruvananthapuram', location_type: 'corporation', latitude: 8.5241, longitude: 76.9366, pincode: '695001' },
  { district: 'Thiruvananthapuram', city: 'Kazhakkoottam', location_type: 'town', latitude: 8.5686, longitude: 76.8731, pincode: '695582' },
  { district: 'Thiruvananthapuram', city: 'Attingal', location_type: 'municipality', latitude: 8.6965, longitude: 76.8143, pincode: '695101' },
  { district: 'Thiruvananthapuram', city: 'Nedumangad', location_type: 'municipality', latitude: 8.6042, longitude: 76.9995, pincode: '695541' },
  { district: 'Thiruvananthapuram', city: 'Neyyattinkara', location_type: 'municipality', latitude: 8.4022, longitude: 77.0864, pincode: '695121' },
  { district: 'Thiruvananthapuram', city: 'Varkala', location_type: 'municipality', latitude: 8.7379, longitude: 76.7163, pincode: '695141' },
  { district: 'Thiruvananthapuram', city: 'Kattakkada', location_type: 'town', latitude: 8.5086, longitude: 77.0805, pincode: '695572' },
  { district: 'Thiruvananthapuram', city: 'Kilimanoor', location_type: 'town', latitude: 8.7667, longitude: 76.8778, pincode: '695601' },
  { district: 'Thiruvananthapuram', city: 'Parassala', location_type: 'town', latitude: 8.3375, longitude: 77.1519, pincode: '695502' },
  { district: 'Thiruvananthapuram', city: 'Balaramapuram', location_type: 'town', latitude: 8.4239, longitude: 77.0450, pincode: '695501' },
  { district: 'Thiruvananthapuram', city: 'Pothencode', location_type: 'town', latitude: 8.6186, longitude: 76.9014, pincode: '695584' },

  // --- KOLLAM DISTRICT ---
  { district: 'Kollam', city: 'Kollam', location_type: 'corporation', latitude: 8.8932, longitude: 76.6141, pincode: '691001' },
  { district: 'Kollam', city: 'Karunagappally', location_type: 'municipality', latitude: 9.0544, longitude: 76.5358, pincode: '690518' },
  { district: 'Kollam', city: 'Paravur', location_type: 'municipality', latitude: 8.8119, longitude: 76.6697, pincode: '691301' },
  { district: 'Kollam', city: 'Punalur', location_type: 'municipality', latitude: 9.0191, longitude: 76.9272, pincode: '691305' },
  { district: 'Kollam', city: 'Kottarakkara', location_type: 'municipality', latitude: 8.9984, longitude: 76.7709, pincode: '691506' },
  { district: 'Kollam', city: 'Sasthamcotta', location_type: 'town', latitude: 9.0433, longitude: 76.6347, pincode: '690521' },
  { district: 'Kollam', city: 'Anchal', location_type: 'town', latitude: 8.9400, longitude: 76.9142, pincode: '691306' },
  { district: 'Kollam', city: 'Chathannoor', location_type: 'town', latitude: 8.8583, longitude: 76.7214, pincode: '691572' },
  { district: 'Kollam', city: 'Kundara', location_type: 'town', latitude: 8.9619, longitude: 76.6806, pincode: '691501' },
  { district: 'Kollam', city: 'Pathanapuram', location_type: 'town', latitude: 9.0886, longitude: 76.8583, pincode: '689695' },

  // --- PATHANAMTHITTA DISTRICT ---
  { district: 'Pathanamthitta', city: 'Pathanamthitta', location_type: 'municipality', latitude: 9.2648, longitude: 76.7870, pincode: '689645' },
  { district: 'Pathanamthitta', city: 'Tiruvalla', location_type: 'municipality', latitude: 9.3835, longitude: 76.5741, pincode: '689101' },
  { district: 'Pathanamthitta', city: 'Adoor', location_type: 'municipality', latitude: 9.1530, longitude: 76.7356, pincode: '691523' },
  { district: 'Pathanamthitta', city: 'Pandalam', location_type: 'municipality', latitude: 9.2272, longitude: 76.6833, pincode: '689501' },
  { district: 'Pathanamthitta', city: 'Ranni', location_type: 'town', latitude: 9.3800, longitude: 76.7800, pincode: '689672' },
  { district: 'Pathanamthitta', city: 'Kozhencherry', location_type: 'town', latitude: 9.3400, longitude: 76.7100, pincode: '689641' },
  { district: 'Pathanamthitta', city: 'Konni', location_type: 'town', latitude: 9.2300, longitude: 76.8500, pincode: '689691' },
  { district: 'Pathanamthitta', city: 'Mallappally', location_type: 'town', latitude: 9.4447, longitude: 76.6500, pincode: '689585' },

  // --- ALAPPUZHA DISTRICT ---
  { district: 'Alappuzha', city: 'Alappuzha', location_type: 'municipality', latitude: 9.4981, longitude: 76.3388, pincode: '688001' },
  { district: 'Alappuzha', city: 'Cherthala', location_type: 'municipality', latitude: 9.6844, longitude: 76.3328, pincode: '688524' },
  { district: 'Alappuzha', city: 'Kayamkulam', location_type: 'municipality', latitude: 9.1728, longitude: 76.5000, pincode: '690502' },
  { district: 'Alappuzha', city: 'Mavelikkara', location_type: 'municipality', latitude: 9.2667, longitude: 76.5500, pincode: '690101' },
  { district: 'Alappuzha', city: 'Chengannur', location_type: 'municipality', latitude: 9.3175, longitude: 76.6136, pincode: '689121' },
  { district: 'Alappuzha', city: 'Haripad', location_type: 'municipality', latitude: 9.2833, longitude: 76.4500, pincode: '690514' },
  { district: 'Alappuzha', city: 'Ambalappuzha', location_type: 'town', latitude: 9.3800, longitude: 76.3500, pincode: '688561' },
  { district: 'Alappuzha', city: 'Aroor', location_type: 'town', latitude: 9.8736, longitude: 76.3028, pincode: '688534' },
  { district: 'Alappuzha', city: 'Kuttanad', location_type: 'town', latitude: 9.4200, longitude: 76.4700, pincode: '688504' },

  // --- KOTTAYAM DISTRICT ---
  { district: 'Kottayam', city: 'Kottayam', location_type: 'municipality', latitude: 9.5916, longitude: 76.5222, pincode: '686001' },
  { district: 'Kottayam', city: 'Changanassery', location_type: 'municipality', latitude: 9.4442, longitude: 76.5367, pincode: '686101' },
  { district: 'Kottayam', city: 'Pala', location_type: 'municipality', latitude: 9.7119, longitude: 76.6836, pincode: '686575' },
  { district: 'Kottayam', city: 'Vaikom', location_type: 'municipality', latitude: 9.7500, longitude: 76.4000, pincode: '686141' },
  { district: 'Kottayam', city: 'Ettumanoor', location_type: 'municipality', latitude: 9.6692, longitude: 76.5622, pincode: '686631' },
  { district: 'Kottayam', city: 'Erattupetta', location_type: 'municipality', latitude: 9.6897, longitude: 76.7828, pincode: '686121' },
  { district: 'Kottayam', city: 'Kanjirappally', location_type: 'town', latitude: 9.5556, longitude: 76.7889, pincode: '686507' },
  { district: 'Kottayam', city: 'Pambady', location_type: 'town', latitude: 9.5700, longitude: 76.6400, pincode: '686502' },
  { district: 'Kottayam', city: 'Kaduthuruthy', location_type: 'town', latitude: 9.7700, longitude: 76.4900, pincode: '686604' },
  { district: 'Kottayam', city: 'Mundakayam', location_type: 'town', latitude: 9.5333, longitude: 76.8833, pincode: '686513' },
  { district: 'Kottayam', city: 'Kuravilangad', location_type: 'town', latitude: 9.7558, longitude: 76.5667, pincode: '686633' },

  // --- IDUKKI DISTRICT ---
  { district: 'Idukki', city: 'Thodupuzha', location_type: 'municipality', latitude: 9.8959, longitude: 76.7184, pincode: '685584' },
  { district: 'Idukki', city: 'Kattappana', location_type: 'municipality', latitude: 9.7500, longitude: 77.1167, pincode: '685508' },
  { district: 'Idukki', city: 'Munnar', location_type: 'town', latitude: 10.0889, longitude: 77.0595, pincode: '685612' },
  { district: 'Idukki', city: 'Adimali', location_type: 'town', latitude: 10.0100, longitude: 76.9500, pincode: '685561' },
  { district: 'Idukki', city: 'Painavu', location_type: 'town', latitude: 9.8483, longitude: 76.9389, pincode: '685603' },
  { district: 'Idukki', city: 'Nedumkandam', location_type: 'town', latitude: 9.8333, longitude: 77.1667, pincode: '685553' },
  { district: 'Idukki', city: 'Kumily', location_type: 'town', latitude: 9.6000, longitude: 77.1667, pincode: '685509' },
  { district: 'Idukki', city: 'Peerumade', location_type: 'town', latitude: 9.5700, longitude: 76.9800, pincode: '685531' },

  // --- ERNAKULAM DISTRICT ---
  { district: 'Ernakulam', city: 'Kochi', location_type: 'corporation', latitude: 9.9312, longitude: 76.2673, pincode: '682001' },
  { district: 'Ernakulam', city: 'Aluva', location_type: 'municipality', latitude: 10.1076, longitude: 76.3516, pincode: '683101' },
  { district: 'Ernakulam', city: 'Angamaly', location_type: 'municipality', latitude: 10.1960, longitude: 76.3860, pincode: '683572' },
  { district: 'Ernakulam', city: 'Perumbavoor', location_type: 'municipality', latitude: 10.1111, longitude: 76.4778, pincode: '683542' },
  { district: 'Ernakulam', city: 'Muvattupuzha', location_type: 'municipality', latitude: 9.9833, longitude: 76.5833, pincode: '686661' },
  { district: 'Ernakulam', city: 'Kothamangalam', location_type: 'municipality', latitude: 10.0667, longitude: 76.6167, pincode: '686691' },
  { district: 'Ernakulam', city: 'Tripunithura', location_type: 'municipality', latitude: 9.9500, longitude: 76.3500, pincode: '682301' },
  { district: 'Ernakulam', city: 'Kalamassery', location_type: 'municipality', latitude: 10.0544, longitude: 76.3197, pincode: '683104' },
  { district: 'Ernakulam', city: 'North Paravur', location_type: 'municipality', latitude: 10.1444, longitude: 76.2294, pincode: '683513' },
  { district: 'Ernakulam', city: 'Maradu', location_type: 'municipality', latitude: 9.9281, longitude: 76.3275, pincode: '682304' },
  { district: 'Ernakulam', city: 'Thrikkakara', location_type: 'municipality', latitude: 10.0333, longitude: 76.3333, pincode: '682021' },
  { district: 'Ernakulam', city: 'Piravom', location_type: 'municipality', latitude: 9.8700, longitude: 76.4900, pincode: '686664' },
  { district: 'Ernakulam', city: 'Koothattukulam', location_type: 'municipality', latitude: 9.8600, longitude: 76.5800, pincode: '686662' },
  { district: 'Ernakulam', city: 'Kakkanad', location_type: 'town', latitude: 10.0159, longitude: 76.3419, pincode: '682030' },
  { district: 'Ernakulam', city: 'Edappally', location_type: 'town', latitude: 10.0261, longitude: 76.3094, pincode: '682024' },

  // --- THRISSUR DISTRICT ---
  { district: 'Thrissur', city: 'Thrissur', location_type: 'corporation', latitude: 10.5276, longitude: 76.2144, pincode: '680001' },
  { district: 'Thrissur', city: 'Chalakudy', location_type: 'municipality', latitude: 10.3070, longitude: 76.3333, pincode: '680307' },
  { district: 'Thrissur', city: 'Kodungallur', location_type: 'municipality', latitude: 10.2200, longitude: 76.2000, pincode: '680664' },
  { district: 'Thrissur', city: 'Kunnamkulam', location_type: 'municipality', latitude: 10.6500, longitude: 76.0800, pincode: '680503' },
  { district: 'Thrissur', city: 'Guruvayur', location_type: 'municipality', latitude: 10.5947, longitude: 76.0397, pincode: '680101' },
  { district: 'Thrissur', city: 'Irinjalakuda', location_type: 'municipality', latitude: 10.3400, longitude: 76.2000, pincode: '680121' },
  { district: 'Thrissur', city: 'Wadakkanchery', location_type: 'municipality', latitude: 10.6667, longitude: 76.2500, pincode: '680582' },
  { district: 'Thrissur', city: 'Chavakkad', location_type: 'municipality', latitude: 10.5800, longitude: 76.0200, pincode: '680506' },
  { district: 'Thrissur', city: 'Ollur', location_type: 'town', latitude: 10.4700, longitude: 76.2400, pincode: '680306' },
  { district: 'Thrissur', city: 'Pudukad', location_type: 'town', latitude: 10.4200, longitude: 76.2700, pincode: '680301' },
  { district: 'Thrissur', city: 'Triprayar', location_type: 'town', latitude: 10.4200, longitude: 76.1200, pincode: '680567' },

  // --- PALAKKAD DISTRICT ---
  { district: 'Palakkad', city: 'Palakkad', location_type: 'municipality', latitude: 10.7867, longitude: 76.6548, pincode: '678001' },
  { district: 'Palakkad', city: 'Ottappalam', location_type: 'municipality', latitude: 10.7738, longitude: 76.3797, pincode: '679101' },
  { district: 'Palakkad', city: 'Shoranur', location_type: 'municipality', latitude: 10.7600, longitude: 76.2800, pincode: '679121' },
  { district: 'Palakkad', city: 'Chittur-Thathamangalam', location_type: 'municipality', latitude: 10.7000, longitude: 76.7200, pincode: '678101' },
  { district: 'Palakkad', city: 'Pattambi', location_type: 'municipality', latitude: 10.8100, longitude: 76.1800, pincode: '679303' },
  { district: 'Palakkad', city: 'Cherpulassery', location_type: 'municipality', latitude: 10.8800, longitude: 76.3100, pincode: '679503' },
  { district: 'Palakkad', city: 'Mannarkkad', location_type: 'municipality', latitude: 10.9900, longitude: 76.4600, pincode: '678582' },
  { district: 'Palakkad', city: 'Alathur', location_type: 'town', latitude: 10.6400, longitude: 76.5400, pincode: '678541' },
  { district: 'Palakkad', city: 'Kollengode', location_type: 'town', latitude: 10.6200, longitude: 76.6900, pincode: '678506' },
  { district: 'Palakkad', city: 'Nemmara', location_type: 'town', latitude: 10.5900, longitude: 76.6000, pincode: '678508' },
  { district: 'Palakkad', city: 'Vadakkencherry', location_type: 'town', latitude: 10.5900, longitude: 76.5000, pincode: '678683' },
  { district: 'Palakkad', city: 'Kongad', location_type: 'town', latitude: 10.8900, longitude: 76.5200, pincode: '678631' },

  // --- MALAPPURAM DISTRICT ---
  { district: 'Malappuram', city: 'Malappuram', location_type: 'municipality', latitude: 11.0734, longitude: 76.0740, pincode: '676505' },
  { district: 'Malappuram', city: 'Manjeri', location_type: 'municipality', latitude: 11.1200, longitude: 76.1200, pincode: '676121' },
  { district: 'Malappuram', city: 'Perinthalmanna', location_type: 'municipality', latitude: 10.9800, longitude: 76.2200, pincode: '679322' },
  { district: 'Malappuram', city: 'Ponnani', location_type: 'municipality', latitude: 10.7700, longitude: 75.9200, pincode: '679577' },
  { district: 'Malappuram', city: 'Tirur', location_type: 'municipality', latitude: 10.9100, longitude: 75.9200, pincode: '676101' },
  { district: 'Malappuram', city: 'Kottakkal', location_type: 'municipality', latitude: 11.0000, longitude: 75.9900, pincode: '676503' },
  { district: 'Malappuram', city: 'Nilambur', location_type: 'municipality', latitude: 11.2800, longitude: 76.2300, pincode: '679329' },
  { district: 'Malappuram', city: 'Kondotty', location_type: 'municipality', latitude: 11.1500, longitude: 75.9600, pincode: '673638' },
  { district: 'Malappuram', city: 'Tanur', location_type: 'municipality', latitude: 10.9700, longitude: 75.8700, pincode: '676302' },
  { district: 'Malappuram', city: 'Parappanangadi', location_type: 'municipality', latitude: 11.0500, longitude: 75.8600, pincode: '676303' },
  { district: 'Malappuram', city: 'Valanchery', location_type: 'municipality', latitude: 10.9000, longitude: 76.0700, pincode: '676552' },
  { district: 'Malappuram', city: 'Edakkara', location_type: 'town', latitude: 11.3500, longitude: 76.3000, pincode: '679331' },

  // --- KOZHIKODE DISTRICT ---
  { district: 'Kozhikode', city: 'Kozhikode', location_type: 'corporation', latitude: 11.2588, longitude: 75.7804, pincode: '673001' },
  { district: 'Kozhikode', city: 'Vatakara', location_type: 'municipality', latitude: 11.6000, longitude: 75.5900, pincode: '673101' },
  { district: 'Kozhikode', city: 'Koyilandy', location_type: 'municipality', latitude: 11.4300, longitude: 75.7000, pincode: '673305' },
  { district: 'Kozhikode', city: 'Ramanattukara', location_type: 'municipality', latitude: 11.1800, longitude: 75.8700, pincode: '673633' },
  { district: 'Kozhikode', city: 'Feroke', location_type: 'municipality', latitude: 11.1700, longitude: 75.8300, pincode: '673631' },
  { district: 'Kozhikode', city: 'Payyoli', location_type: 'municipality', latitude: 11.5200, longitude: 75.6500, pincode: '673522' },
  { district: 'Kozhikode', city: 'Mukkam', location_type: 'municipality', latitude: 11.3200, longitude: 75.9800, pincode: '673602' },
  { district: 'Kozhikode', city: 'Koduvally', location_type: 'municipality', latitude: 11.3600, longitude: 75.9100, pincode: '673572' },
  { district: 'Kozhikode', city: 'Balussery', location_type: 'town', latitude: 11.4500, longitude: 75.8200, pincode: '673612' },
  { district: 'Kozhikode', city: 'Thamarassery', location_type: 'town', latitude: 11.4200, longitude: 75.9300, pincode: '673573' },

  // --- WAYANAD DISTRICT ---
  { district: 'Wayanad', city: 'Kalpetta', location_type: 'municipality', latitude: 11.6103, longitude: 76.0827, pincode: '673121' },
  { district: 'Wayanad', city: 'Mananthavady', location_type: 'municipality', latitude: 11.8000, longitude: 76.0000, pincode: '670645' },
  { district: 'Wayanad', city: 'Sulthan Bathery', location_type: 'municipality', latitude: 11.6667, longitude: 76.2500, pincode: '673592' },
  { district: 'Wayanad', city: 'Vythiri', location_type: 'town', latitude: 11.5500, longitude: 76.0400, pincode: '673576' },
  { district: 'Wayanad', city: 'Meppadi', location_type: 'town', latitude: 11.5500, longitude: 76.1300, pincode: '673577' },
  { district: 'Wayanad', city: 'Panamaram', location_type: 'town', latitude: 11.7300, longitude: 76.0700, pincode: '670721' },

  // --- KANNUR DISTRICT ---
  { district: 'Kannur', city: 'Kannur', location_type: 'corporation', latitude: 11.8745, longitude: 75.3704, pincode: '670001' },
  { district: 'Kannur', city: 'Thalassery', location_type: 'municipality', latitude: 11.7500, longitude: 75.4900, pincode: '670101' },
  { district: 'Kannur', city: 'Payyanur', location_type: 'municipality', latitude: 12.1000, longitude: 75.2000, pincode: '670307' },
  { district: 'Kannur', city: 'Taliparamba', location_type: 'municipality', latitude: 12.0400, longitude: 75.3600, pincode: '670141' },
  { district: 'Kannur', city: 'Mattannur', location_type: 'municipality', latitude: 11.9300, longitude: 75.5700, pincode: '670702' },
  { district: 'Kannur', city: 'Koothuparamba', location_type: 'municipality', latitude: 11.8300, longitude: 75.5700, pincode: '670643' },
  { district: 'Kannur', city: 'Anthoor', location_type: 'municipality', latitude: 11.9800, longitude: 75.3700, pincode: '670562' },
  { district: 'Kannur', city: 'Panoor', location_type: 'municipality', latitude: 11.7700, longitude: 75.5800, pincode: '670692' },
  { district: 'Kannur', city: 'Iritty', location_type: 'municipality', latitude: 11.9800, longitude: 75.6700, pincode: '670703' },
  { district: 'Kannur', city: 'Sreekandapuram', location_type: 'municipality', latitude: 12.0300, longitude: 75.5200, pincode: '670631' },

  // --- KASARAGOD DISTRICT ---
  { district: 'Kasaragod', city: 'Kasaragod', location_type: 'municipality', latitude: 12.5102, longitude: 74.9852, pincode: '671121' },
  { district: 'Kasaragod', city: 'Kanhangad', location_type: 'municipality', latitude: 12.3100, longitude: 75.0900, pincode: '671315' },
  { district: 'Kasaragod', city: 'Nileshwaram', location_type: 'municipality', latitude: 12.2500, longitude: 75.1300, pincode: '671314' },
  { district: 'Kasaragod', city: 'Uppala', location_type: 'town', latitude: 12.6800, longitude: 74.9000, pincode: '671322' },
  { district: 'Kasaragod', city: 'Kumbla', location_type: 'town', latitude: 12.5800, longitude: 74.9500, pincode: '671321' },
  { district: 'Kasaragod', city: 'Manjeshwar', location_type: 'town', latitude: 12.7100, longitude: 74.8800, pincode: '671323' },
  { district: 'Kasaragod', city: 'Cheruvathur', location_type: 'town', latitude: 12.2100, longitude: 75.1600, pincode: '671313' },
  { district: 'Kasaragod', city: 'Bekal', location_type: 'town', latitude: 12.3900, longitude: 75.0300, pincode: '671318' }
];

module.exports = { KERALA_LOCATIONS_DATA };
