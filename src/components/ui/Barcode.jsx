import React from 'react';

const Barcode = ({ value }) => {
    if (!value) return null;

    const getBarcodeBars = (data) => {
        const patterns = {
            '0': '1101100', '1': '1100110', '2': '1001101', '3': '1011001', '4': '1010011',
            '5': '1100101', '6': '1000111', '7': '1011100', '8': '1110100', '9': '1110010',
            '-': '1001011'
        };
        const start = '10100'; 
        const stop = '10100';
        
        let binaryData = start;
        for (const char of data) {
            if (patterns[char]) {
                binaryData += patterns[char];
            }
        }
        binaryData += stop;
        
        return binaryData.split('').map((bar, index) => (
            <div
                key={index}
                style={{
                    height: '100%',
                    width: '1px',
                    backgroundColor: bar === '1' ? '#000' : 'transparent',
                }}
            ></div>
        ));
    };
    
    const sanitizedValue = value.replace(/[^0-9-]/g, '');

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
                style={{
                    display: 'flex',
                    height: '48px',
                    alignItems: 'stretch',
                }}
                aria-label={`Barcode for ${sanitizedValue}`}
            >
                {getBarcodeBars(sanitizedValue)}
            </div>
            <p style={{ letterSpacing: '0.1em', fontSize: '10px', fontFamily: 'monospace', marginTop: '4px' }}>
                {sanitizedValue}
            </p>
        </div>
    );
};

export default Barcode;