const fs = require('fs');
const path = require('path');

console.log('Reading massive Barangays.json file...');

const inputPath = path.join(__dirname, 'Barangays.json');
const outputPath = path.join(__dirname, 'maragondon_barangays.json');

try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const geoJson = JSON.parse(rawData);

    console.log('Extracting Maragondon coordinates...');
    const maragondonFeatures = geoJson.features.filter(feature => 
        feature.properties.NAME_2 === 'Maragondon' && 
        feature.properties.PROVINCE === 'Cavite'
    );

    if (maragondonFeatures.length === 0) {
        console.error('CRITICAL ERROR: No data found for Maragondon. Check your source file.');
        process.exit(1);
    }

    const maragondonGeoJson = {
        type: 'FeatureCollection',
        features: maragondonFeatures
    };

    fs.writeFileSync(outputPath, JSON.stringify(maragondonGeoJson, null, 2));

    console.log(`✅ SUCCESS: Extracted ${maragondonFeatures.length} barangays.`);
    console.log(`✅ File saved perfectly to: ${outputPath}`);
    
} catch (error) {
    console.error(`ERROR: ${error.message}`);
    console.log("Make sure 'Barangays.json' is in the exact same folder as this script.");
}