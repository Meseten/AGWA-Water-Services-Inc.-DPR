import React from 'react';

const Barcode = ({ value }) => {
    if (!value) return null;

    const getBarcodeBars = (data) => {
        const patterns = {
            '0': '1101100', '1': '1100110', '2': '1001101', '3': '1011001', '4': '1010011',
            '5': '1100101', '6': '1000111', '7': '1011100', '8': '1110100', '9': '1110010',
            '-': '1001011'
        };
        const start = '11010010000';
        const stop = '1100011101011';
        
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
                className={`h-full ${bar === '1' ? 'bg-black' : 'bg-transparent'}`}
                style={{ width: '1px' }} 
            ></div>
        ));
    };
    
    const sanitizedValue = value.replace(/[^0-9-]/g, '');

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="flex h-12 items-stretch" aria-label={`Barcode for ${sanitizedValue}`}>
                {getBarcodeBars(sanitizedValue)}
            </div>
            <p className="tracking-widest text-xs font-mono mt-1">{sanitizedValue}</p>
        </div>
    );
};

export default Barcode;