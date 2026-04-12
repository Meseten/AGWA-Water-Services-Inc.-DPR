const maragondonDistricts = {
    "Poblacion (Town Proper)": ["Poblacion 1-A", "Poblacion 1-B", "Poblacion 2-A", "Poblacion 2-B", "Poblacion III - Caingin"],
    "Garita": ["Garita A", "Garita B"],
    "Bucal (Lower)": ["Bucal 1", "Bucal 2", "Bucal 3-A"],
    "Bucal (Upper)": ["Bucal 3-B", "Bucal 4-A", "Bucal 4-B"],
    "San Miguel Area": ["San Miguel A", "San Miguel B"]
};

export const getDistricts = () => Object.keys(maragondonDistricts);

export const getBarangaysInDistrict = (district) => maragondonDistricts[district] || [];