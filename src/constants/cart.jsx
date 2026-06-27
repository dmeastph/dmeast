import React from "react";

// Cart / checkout constants
export const COUNTRY_CODES = [
  {code:"+63",flag:"🇵🇭",name:"Philippines"},
  {code:"+1", flag:"🇺🇸",name:"USA / Canada"},
  {code:"+65",flag:"🇸🇬",name:"Singapore"},
  {code:"+60",flag:"🇲🇾",name:"Malaysia"},
  {code:"+62",flag:"🇮🇩",name:"Indonesia"},
  {code:"+66",flag:"🇹🇭",name:"Thailand"},
  {code:"+84",flag:"🇻🇳",name:"Vietnam"},
  {code:"+971",flag:"🇦🇪",name:"UAE"},
  {code:"+966",flag:"🇸🇦",name:"Saudi Arabia"},
  {code:"+974",flag:"🇶🇦",name:"Qatar"},
  {code:"+44",flag:"🇬🇧",name:"UK"},
  {code:"+61",flag:"🇦🇺",name:"Australia"},
  {code:"+81",flag:"🇯🇵",name:"Japan"},
  {code:"+82",flag:"🇰🇷",name:"South Korea"},
];

export const validateEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
export const validateName  = n => n.trim().length >= 2;
export const validatePhone = p => p.replace(/\D/g,"").length >= 7;

export const PAYMENT_METHODS_DATA = [
  {id:"gcash",    label:"GCash",         color:"#007DFF", bg:"#E8F2FF",
   logo: <svg viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{height:22,width:"auto"}}><text x="4" y="21" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="20" fill="#007DFF">G</text><text x="22" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="16" fill="#1A1410">Cash</text></svg>},
  {id:"maya",     label:"Maya",          color:"#5B2D8E", bg:"#F0E8FF",
   logo: <svg viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{height:22,width:"auto"}}><rect x="2" y="4" width="20" height="20" rx="5" fill="#5B2D8E"/><text x="6" y="19" fontFamily="Arial" fontWeight="900" fontSize="14" fill="#fff">M</text><text x="26" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="16" fill="#1A1410">maya</text></svg>},
  {id:"visa",     label:"Visa",          color:"#1A1F71", bg:"#EEF0FF",
   logo: <svg viewBox="0 0 60 24" fill="none" style={{height:22,width:"auto"}}><rect width="60" height="24" rx="4" fill="#1A1F71"/><text x="6" y="18" fontFamily="Arial" fontWeight="900" fontStyle="italic" fontSize="16" fill="#fff" letterSpacing="-1">VISA</text></svg>},
  {id:"mastercard",label:"Mastercard",   color:"#EB001B", bg:"#FFF0F0",
   logo: <svg viewBox="0 0 52 24" fill="none" style={{height:22,width:"auto"}}><circle cx="18" cy="12" r="10" fill="#EB001B"/><circle cx="34" cy="12" r="10" fill="#F79E1B"/><ellipse cx="26" cy="12" rx="4" ry="9.5" fill="#FF5F00"/></svg>},
  {id:"bank",     label:"Bank Transfer", color:"#1A7F5B", bg:"#E6F5EF",
   logo: <svg viewBox="0 0 80 28" fill="none" style={{height:22,width:"auto"}}><rect x="2" y="10" width="18" height="14" rx="2" fill="#1A7F5B"/><polygon points="11,2 2,10 20,10" fill="#1A7F5B"/><rect x="5" y="14" width="4" height="7" fill="#fff"/><rect x="12" y="14" width="4" height="7" fill="#fff"/><text x="24" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="13" fill="#1A1410">Bank Transfer</text></svg>},
  {id:"qrph",     label:"QR Ph",         color:"#CC2F3C", bg:"#FDECEA",
   logo: <svg viewBox="0 0 70 28" fill="none" style={{height:22,width:"auto"}}><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="#CC2F3C" strokeWidth="2" fill="none"/><rect x="5" y="5" width="5" height="5" rx="0.5" fill="#CC2F3C"/><rect x="17" y="2" width="11" height="11" rx="1.5" stroke="#CC2F3C" strokeWidth="2" fill="none"/><rect x="20" y="5" width="5" height="5" rx="0.5" fill="#CC2F3C"/><rect x="2" y="17" width="11" height="11" rx="1.5" stroke="#CC2F3C" strokeWidth="2" fill="none"/><rect x="5" y="20" width="5" height="5" rx="0.5" fill="#CC2F3C"/><rect x="17" y="17" width="3" height="3" fill="#CC2F3C"/><rect x="22" y="17" width="3" height="3" fill="#CC2F3C"/><rect x="25" y="20" width="3" height="3" fill="#CC2F3C"/><rect x="17" y="25" width="3" height="3" fill="#CC2F3C"/><rect x="22" y="22" width="3" height="6" fill="#CC2F3C"/><text x="34" y="21" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="14" fill="#CC2F3C">QR Ph</text></svg>},
];

// ─── v16.11: COUNTRY LIST FOR INTERNATIONAL DROPDOWN ────────────────────────
// ISO 3166-1 alpha-2 codes with flag emojis, sorted alphabetically by common name
// Common ports/major shipping destinations are flagged with a star prefix for display
export const COUNTRIES = [
  {c:"AF",n:"Afghanistan",f:"🇦🇫"},{c:"AL",n:"Albania",f:"🇦🇱"},{c:"DZ",n:"Algeria",f:"🇩🇿"},{c:"AD",n:"Andorra",f:"🇦🇩"},
  {c:"AO",n:"Angola",f:"🇦🇴"},{c:"AG",n:"Antigua and Barbuda",f:"🇦🇬"},{c:"AR",n:"Argentina",f:"🇦🇷"},{c:"AM",n:"Armenia",f:"🇦🇲"},
  {c:"AU",n:"Australia",f:"🇦🇺"},{c:"AT",n:"Austria",f:"🇦🇹"},{c:"AZ",n:"Azerbaijan",f:"🇦🇿"},{c:"BS",n:"Bahamas",f:"🇧🇸"},
  {c:"BH",n:"Bahrain",f:"🇧🇭"},{c:"BD",n:"Bangladesh",f:"🇧🇩"},{c:"BB",n:"Barbados",f:"🇧🇧"},{c:"BY",n:"Belarus",f:"🇧🇾"},
  {c:"BE",n:"Belgium",f:"🇧🇪"},{c:"BZ",n:"Belize",f:"🇧🇿"},{c:"BJ",n:"Benin",f:"🇧🇯"},{c:"BT",n:"Bhutan",f:"🇧🇹"},
  {c:"BO",n:"Bolivia",f:"🇧🇴"},{c:"BA",n:"Bosnia and Herzegovina",f:"🇧🇦"},{c:"BW",n:"Botswana",f:"🇧🇼"},{c:"BR",n:"Brazil",f:"🇧🇷"},
  {c:"BN",n:"Brunei",f:"🇧🇳"},{c:"BG",n:"Bulgaria",f:"🇧🇬"},{c:"BF",n:"Burkina Faso",f:"🇧🇫"},{c:"BI",n:"Burundi",f:"🇧🇮"},
  {c:"KH",n:"Cambodia",f:"🇰🇭"},{c:"CM",n:"Cameroon",f:"🇨🇲"},{c:"CA",n:"Canada",f:"🇨🇦"},{c:"CV",n:"Cape Verde",f:"🇨🇻"},
  {c:"CF",n:"Central African Republic",f:"🇨🇫"},{c:"TD",n:"Chad",f:"🇹🇩"},{c:"CL",n:"Chile",f:"🇨🇱"},{c:"CN",n:"China",f:"🇨🇳"},
  {c:"CO",n:"Colombia",f:"🇨🇴"},{c:"KM",n:"Comoros",f:"🇰🇲"},{c:"CG",n:"Congo (Republic)",f:"🇨🇬"},{c:"CD",n:"Congo (DR)",f:"🇨🇩"},
  {c:"CR",n:"Costa Rica",f:"🇨🇷"},{c:"CI",n:"Côte d'Ivoire",f:"🇨🇮"},{c:"HR",n:"Croatia",f:"🇭🇷"},{c:"CU",n:"Cuba",f:"🇨🇺"},
  {c:"CY",n:"Cyprus",f:"🇨🇾"},{c:"CZ",n:"Czechia",f:"🇨🇿"},{c:"DK",n:"Denmark",f:"🇩🇰"},{c:"DJ",n:"Djibouti",f:"🇩🇯"},
  {c:"DM",n:"Dominica",f:"🇩🇲"},{c:"DO",n:"Dominican Republic",f:"🇩🇴"},{c:"EC",n:"Ecuador",f:"🇪🇨"},{c:"EG",n:"Egypt",f:"🇪🇬"},
  {c:"SV",n:"El Salvador",f:"🇸🇻"},{c:"GQ",n:"Equatorial Guinea",f:"🇬🇶"},{c:"ER",n:"Eritrea",f:"🇪🇷"},{c:"EE",n:"Estonia",f:"🇪🇪"},
  {c:"SZ",n:"Eswatini",f:"🇸🇿"},{c:"ET",n:"Ethiopia",f:"🇪🇹"},{c:"FJ",n:"Fiji",f:"🇫🇯"},{c:"FI",n:"Finland",f:"🇫🇮"},
  {c:"FR",n:"France",f:"🇫🇷"},{c:"GA",n:"Gabon",f:"🇬🇦"},{c:"GM",n:"Gambia",f:"🇬🇲"},{c:"GE",n:"Georgia",f:"🇬🇪"},
  {c:"DE",n:"Germany",f:"🇩🇪"},{c:"GH",n:"Ghana",f:"🇬🇭"},{c:"GR",n:"Greece",f:"🇬🇷"},{c:"GD",n:"Grenada",f:"🇬🇩"},
  {c:"GT",n:"Guatemala",f:"🇬🇹"},{c:"GN",n:"Guinea",f:"🇬🇳"},{c:"GW",n:"Guinea-Bissau",f:"🇬🇼"},{c:"GY",n:"Guyana",f:"🇬🇾"},
  {c:"HT",n:"Haiti",f:"🇭🇹"},{c:"HN",n:"Honduras",f:"🇭🇳"},{c:"HK",n:"Hong Kong",f:"🇭🇰"},{c:"HU",n:"Hungary",f:"🇭🇺"},
  {c:"IS",n:"Iceland",f:"🇮🇸"},{c:"IN",n:"India",f:"🇮🇳"},{c:"ID",n:"Indonesia",f:"🇮🇩"},{c:"IR",n:"Iran",f:"🇮🇷"},
  {c:"IQ",n:"Iraq",f:"🇮🇶"},{c:"IE",n:"Ireland",f:"🇮🇪"},{c:"IL",n:"Israel",f:"🇮🇱"},{c:"IT",n:"Italy",f:"🇮🇹"},
  {c:"JM",n:"Jamaica",f:"🇯🇲"},{c:"JP",n:"Japan",f:"🇯🇵"},{c:"JO",n:"Jordan",f:"🇯🇴"},{c:"KZ",n:"Kazakhstan",f:"🇰🇿"},
  {c:"KE",n:"Kenya",f:"🇰🇪"},{c:"KI",n:"Kiribati",f:"🇰🇮"},{c:"KW",n:"Kuwait",f:"🇰🇼"},{c:"KG",n:"Kyrgyzstan",f:"🇰🇬"},
  {c:"LA",n:"Laos",f:"🇱🇦"},{c:"LV",n:"Latvia",f:"🇱🇻"},{c:"LB",n:"Lebanon",f:"🇱🇧"},{c:"LS",n:"Lesotho",f:"🇱🇸"},
  {c:"LR",n:"Liberia",f:"🇱🇷"},{c:"LY",n:"Libya",f:"🇱🇾"},{c:"LI",n:"Liechtenstein",f:"🇱🇮"},{c:"LT",n:"Lithuania",f:"🇱🇹"},
  {c:"LU",n:"Luxembourg",f:"🇱🇺"},{c:"MO",n:"Macao",f:"🇲🇴"},{c:"MG",n:"Madagascar",f:"🇲🇬"},{c:"MW",n:"Malawi",f:"🇲🇼"},
  {c:"MY",n:"Malaysia",f:"🇲🇾"},{c:"MV",n:"Maldives",f:"🇲🇻"},{c:"ML",n:"Mali",f:"🇲🇱"},{c:"MT",n:"Malta",f:"🇲🇹"},
  {c:"MH",n:"Marshall Islands",f:"🇲🇭"},{c:"MR",n:"Mauritania",f:"🇲🇷"},{c:"MU",n:"Mauritius",f:"🇲🇺"},{c:"MX",n:"Mexico",f:"🇲🇽"},
  {c:"FM",n:"Micronesia",f:"🇫🇲"},{c:"MD",n:"Moldova",f:"🇲🇩"},{c:"MC",n:"Monaco",f:"🇲🇨"},{c:"MN",n:"Mongolia",f:"🇲🇳"},
  {c:"ME",n:"Montenegro",f:"🇲🇪"},{c:"MA",n:"Morocco",f:"🇲🇦"},{c:"MZ",n:"Mozambique",f:"🇲🇿"},{c:"MM",n:"Myanmar",f:"🇲🇲"},
  {c:"NA",n:"Namibia",f:"🇳🇦"},{c:"NR",n:"Nauru",f:"🇳🇷"},{c:"NP",n:"Nepal",f:"🇳🇵"},{c:"NL",n:"Netherlands",f:"🇳🇱"},
  {c:"NZ",n:"New Zealand",f:"🇳🇿"},{c:"NI",n:"Nicaragua",f:"🇳🇮"},{c:"NE",n:"Niger",f:"🇳🇪"},{c:"NG",n:"Nigeria",f:"🇳🇬"},
  {c:"KP",n:"North Korea",f:"🇰🇵"},{c:"MK",n:"North Macedonia",f:"🇲🇰"},{c:"NO",n:"Norway",f:"🇳🇴"},{c:"OM",n:"Oman",f:"🇴🇲"},
  {c:"PK",n:"Pakistan",f:"🇵🇰"},{c:"PW",n:"Palau",f:"🇵🇼"},{c:"PS",n:"Palestine",f:"🇵🇸"},{c:"PA",n:"Panama",f:"🇵🇦"},
  {c:"PG",n:"Papua New Guinea",f:"🇵🇬"},{c:"PY",n:"Paraguay",f:"🇵🇾"},{c:"PE",n:"Peru",f:"🇵🇪"},{c:"PH",n:"Philippines",f:"🇵🇭"},
  {c:"PL",n:"Poland",f:"🇵🇱"},{c:"PT",n:"Portugal",f:"🇵🇹"},{c:"QA",n:"Qatar",f:"🇶🇦"},{c:"RO",n:"Romania",f:"🇷🇴"},
  {c:"RU",n:"Russia",f:"🇷🇺"},{c:"RW",n:"Rwanda",f:"🇷🇼"},{c:"KN",n:"Saint Kitts and Nevis",f:"🇰🇳"},{c:"LC",n:"Saint Lucia",f:"🇱🇨"},
  {c:"VC",n:"Saint Vincent and the Grenadines",f:"🇻🇨"},{c:"WS",n:"Samoa",f:"🇼🇸"},{c:"SM",n:"San Marino",f:"🇸🇲"},{c:"ST",n:"São Tomé and Príncipe",f:"🇸🇹"},
  {c:"SA",n:"Saudi Arabia",f:"🇸🇦"},{c:"SN",n:"Senegal",f:"🇸🇳"},{c:"RS",n:"Serbia",f:"🇷🇸"},{c:"SC",n:"Seychelles",f:"🇸🇨"},
  {c:"SL",n:"Sierra Leone",f:"🇸🇱"},{c:"SG",n:"Singapore",f:"🇸🇬"},{c:"SK",n:"Slovakia",f:"🇸🇰"},{c:"SI",n:"Slovenia",f:"🇸🇮"},
  {c:"SB",n:"Solomon Islands",f:"🇸🇧"},{c:"SO",n:"Somalia",f:"🇸🇴"},{c:"ZA",n:"South Africa",f:"🇿🇦"},{c:"KR",n:"South Korea",f:"🇰🇷"},
  {c:"SS",n:"South Sudan",f:"🇸🇸"},{c:"ES",n:"Spain",f:"🇪🇸"},{c:"LK",n:"Sri Lanka",f:"🇱🇰"},{c:"SD",n:"Sudan",f:"🇸🇩"},
  {c:"SR",n:"Suriname",f:"🇸🇷"},{c:"SE",n:"Sweden",f:"🇸🇪"},{c:"CH",n:"Switzerland",f:"🇨🇭"},{c:"SY",n:"Syria",f:"🇸🇾"},
  {c:"TW",n:"Taiwan",f:"🇹🇼"},{c:"TJ",n:"Tajikistan",f:"🇹🇯"},{c:"TZ",n:"Tanzania",f:"🇹🇿"},{c:"TH",n:"Thailand",f:"🇹🇭"},
  {c:"TL",n:"Timor-Leste",f:"🇹🇱"},{c:"TG",n:"Togo",f:"🇹🇬"},{c:"TO",n:"Tonga",f:"🇹🇴"},{c:"TT",n:"Trinidad and Tobago",f:"🇹🇹"},
  {c:"TN",n:"Tunisia",f:"🇹🇳"},{c:"TR",n:"Türkiye",f:"🇹🇷"},{c:"TM",n:"Turkmenistan",f:"🇹🇲"},{c:"TV",n:"Tuvalu",f:"🇹🇻"},
  {c:"UG",n:"Uganda",f:"🇺🇬"},{c:"UA",n:"Ukraine",f:"🇺🇦"},{c:"AE",n:"United Arab Emirates",f:"🇦🇪"},{c:"GB",n:"United Kingdom",f:"🇬🇧"},
  {c:"US",n:"United States",f:"🇺🇸"},{c:"UY",n:"Uruguay",f:"🇺🇾"},{c:"UZ",n:"Uzbekistan",f:"🇺🇿"},{c:"VU",n:"Vanuatu",f:"🇻🇺"},
  {c:"VA",n:"Vatican City",f:"🇻🇦"},{c:"VE",n:"Venezuela",f:"🇻🇪"},{c:"VN",n:"Vietnam",f:"🇻🇳"},{c:"YE",n:"Yemen",f:"🇾🇪"},
  {c:"ZM",n:"Zambia",f:"🇿🇲"},{c:"ZW",n:"Zimbabwe",f:"🇿🇼"},
];

// Helper: get ZIP placeholder hint based on country code
export const ZIP_HINTS = {
  US:"e.g., 94105", CA:"e.g., M5V 3A8", GB:"e.g., SW1A 1AA", AU:"e.g., 2000", 
  DE:"e.g., 10115", FR:"e.g., 75001", JP:"e.g., 100-0001", IN:"e.g., 110001",
  SG:"e.g., 049145", PH:"e.g., 1014", CN:"e.g., 100000", BR:"e.g., 01310-100",
  IT:"e.g., 00100", ES:"e.g., 28001", MX:"e.g., 06000", KR:"e.g., 04524",
  TH:"e.g., 10100", ID:"e.g., 10110", MY:"e.g., 50000", VN:"e.g., 100000",
};
export const getZipHint = (countryCode) => ZIP_HINTS[countryCode] || "Optional";

