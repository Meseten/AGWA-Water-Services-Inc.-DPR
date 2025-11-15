export const calculateBillDetails = (
    consumption,
    serviceType,
    meterSize = '1/2"',
    systemSettingsInput = {}
) => {
    let basicCharge = 0;
    let fcda = 0;
    let environmentalCharge = 0;
    let sewerageCharge = 0;
    let maintenanceServiceCharge = 0;
    let governmentTaxes = 0;
    let vat = 0;
    let waterCharge = 0;

    const cons = parseFloat(consumption) || 0;

    const defaultSettings = {
        fcdaPercentage: 1.29,
        environmentalChargePercentage: 25,
        sewerageChargePercentageCommercial: 32.85,
        governmentTaxPercentage: 2,
        vatPercentage: 12,

        minimumChargeResidential: 195.49,
        minimumChargeCommercial: 512.30,
        minimumChargeResLowIncome: 70.07,
        minimumChargeSemiBusiness: 195.49,
        minimumChargeIndustrial: 72.68,

        rates: {
            resLowIncome: [
                { limit: 10, rate: 0, fixed: 70.07 },
                { limit: 20, rate: 14.29 },
                { limit: 30, rate: 23.82 },
                { limit: 40, rate: 45.17 },
                { limit: Infinity, rate: 59.54 }
            ],
            residential: [
                { limit: 10, rate: 0, fixed: 195.49 },
                { limit: 20, rate: 23.82 },
                { limit: 30, rate: 45.17 },
                { limit: 50, rate: 59.54 },
                { limit: 70, rate: 69.52 },
                { limit: 90, rate: 72.89 },
                { limit: 140, rate: 76.14 },
                { limit: 200, rate: 79.42 },
                { limit: Infinity, rate: 82.67 }
            ],
            semiBusiness: [
                { limit: 10, rate: 0, fixed: 195.49 },
                { limit: 20, rate: 39.90 },
                { limit: 40, rate: 49.22 },
                { limit: 60, rate: 62.55 },
                { limit: 80, rate: 72.88 },
                { limit: 130, rate: 76.14 },
                { limit: 180, rate: 79.42 },
                { limit: Infinity, rate: 82.67 }
            ],
            commercial: [
                { limit: 10, rate: 0, fixed: 512.30 },
                { limit: 20, rate: 53.61 },
                { limit: 40, rate: 58.98 },
                { limit: 60, rate: 64.33 },
                { limit: 80, rate: 69.69 },
                { limit: 100, rate: 72.88 },
                { limit: 150, rate: 76.14 },
                { limit: 200, rate: 79.42 },
                { limit: Infinity, rate: 82.67 }
            ],
            industrial: { rate: 72.68 }
        }
    };

    const settings = { ...defaultSettings, ...systemSettingsInput };
    
    const fcdaRate = (settings.fcdaPercentage || defaultSettings.fcdaPercentage) / 100;
    const ecRate = (settings.environmentalChargePercentage || defaultSettings.environmentalChargePercentage) / 100;
    const scRateCommercial = (settings.sewerageChargePercentageCommercial || defaultSettings.sewerageChargePercentageCommercial) / 100;
    const govTaxRate = (settings.governmentTaxPercentage || defaultSettings.governmentTaxPercentage) / 100;
    const vatRate = (settings.vatPercentage || defaultSettings.vatPercentage) / 100;

    const rates = {
        resLowIncome: settings.rates?.resLowIncome || defaultSettings.rates.resLowIncome,
        residential: settings.rates?.residential || defaultSettings.rates.residential,
        semiBusiness: settings.rates?.semiBusiness || defaultSettings.rates.semiBusiness,
        commercial: settings.rates?.commercial || defaultSettings.rates.commercial,
        industrial: settings.rates?.industrial || defaultSettings.rates.industrial,
    };
    
    rates.resLowIncome[0].fixed = settings.minimumChargeResLowIncome || defaultSettings.minimumChargeResLowIncome;
    rates.residential[0].fixed = settings.minimumChargeResidential || defaultSettings.minimumChargeResidential;
    rates.semiBusiness[0].fixed = settings.minimumChargeSemiBusiness || defaultSettings.minimumChargeSemiBusiness;
    rates.commercial[0].fixed = settings.minimumChargeCommercial || defaultSettings.minimumChargeCommercial;
    rates.industrial.rate = settings.minimumChargeIndustrial || defaultSettings.minimumChargeIndustrial;


    const meterSizeCleaned = String(meterSize).replace(/["“”]/g, '').trim();
    if (meterSizeCleaned === '1/2' || meterSizeCleaned === '15mm') maintenanceServiceCharge = 1.50;
    else if (meterSizeCleaned === '3/4' || meterSizeCleaned === '20mm') maintenanceServiceCharge = 2.00;
    else if (meterSizeCleaned === '1' || meterSizeCleaned === '25mm') maintenanceServiceCharge = 3.00;
    else if (meterSizeCleaned === '1 1/4' || meterSizeCleaned === '40mm') maintenanceServiceCharge = 4.00;
    else if (meterSizeCleaned === '1 1/2' || meterSizeCleaned === '32mm') maintenanceServiceCharge = 4.00;
    else if (meterSizeCleaned === '2' || meterSizeCleaned === '50mm') maintenanceServiceCharge = 6.00;
    else if (meterSizeCleaned === '3' || meterSizeCleaned === '75mm') maintenanceServiceCharge = 10.00;
    else if (meterSizeCleaned === '4' || meterSizeCleaned === '100mm') maintenanceServiceCharge = 20.00;
    else if (meterSizeCleaned === '6' || meterSizeCleaned === '150mm') maintenanceServiceCharge = 35.00;
    else if (meterSizeCleaned === '8' || meterSizeCleaned === '200mm') maintenanceServiceCharge = 50.00;
    else maintenanceServiceCharge = 1.50;
    
    const calculateTieredCharge = (tiers) => {
        let charge = 0;
        let remainingCons = cons;
        if (remainingCons > 0 && tiers[0].fixed) {
            charge += tiers[0].fixed;
            remainingCons -= tiers[0].limit;
        }
        for (let i = 1; i < tiers.length; i++) {
            if (remainingCons <= 0) break;
            const prevLimit = tiers[i-1].limit;
            const currentTierConsumptionCap = tiers[i].limit - prevLimit;
            const chargeableCons = Math.min(remainingCons, currentTierConsumptionCap);
            charge += chargeableCons * tiers[i].rate;
            remainingCons -= chargeableCons;
        }
        return charge;
    };

    if (serviceType === 'Residential Low-Income') {
        basicCharge = calculateTieredCharge(rates.resLowIncome);
    } else if (serviceType === 'Residential') {
        basicCharge = calculateTieredCharge(rates.residential);
    } else if (serviceType === 'Semi-Business') { 
        basicCharge = calculateTieredCharge(rates.semiBusiness);
    } else if (serviceType === 'Commercial' || serviceType === 'Admin') {
        basicCharge = calculateTieredCharge(rates.commercial);
    } else if (serviceType === 'Industrial' || serviceType === 'Meter Reading Personnel') {
        basicCharge = cons * rates.industrial.rate;
    } else { 
        basicCharge = calculateTieredCharge(rates.residential);
    }

    fcda = basicCharge * fcdaRate;
    waterCharge = basicCharge + fcda;
    environmentalCharge = waterCharge * ecRate;

    if (serviceType === 'Commercial' || serviceType === 'Industrial' || serviceType === 'Admin' || serviceType === 'Meter Reading Personnel') {
        sewerageCharge = waterCharge * scRateCommercial;
    } else { 
        sewerageCharge = (settings.sewerageChargeResidential / 100) * waterCharge || 0;
    }

    const sumForGovTaxAndVat = waterCharge + environmentalCharge + sewerageCharge + maintenanceServiceCharge;
    governmentTaxes = sumForGovTaxAndVat * govTaxRate;
    
    const vatableSales = sumForGovTaxAndVat;
    vat = vatableSales * vatRate;

    const totalCalculatedCharges = vatableSales + governmentTaxes + vat;

    return {
        consumption: cons, serviceType, meterSize: meterSizeCleaned,
        basicCharge: parseFloat(basicCharge.toFixed(2)),
        fcda: parseFloat(fcda.toFixed(2)),
        waterCharge: parseFloat(waterCharge.toFixed(2)),
        environmentalCharge: parseFloat(environmentalCharge.toFixed(2)),
        sewerageCharge: parseFloat(sewerageCharge.toFixed(2)),
        maintenanceServiceCharge: parseFloat(maintenanceServiceCharge.toFixed(2)),
        subTotalBeforeTaxes: parseFloat(vatableSales.toFixed(2)),
        governmentTaxes: parseFloat(governmentTaxes.toFixed(2)),
        vatableSales: parseFloat(vatableSales.toFixed(2)),
        vat: parseFloat(vat.toFixed(2)),
        totalCalculatedCharges: parseFloat(totalCalculatedCharges.toFixed(2)),
    };
};