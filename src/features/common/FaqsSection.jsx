import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Clock, MapPin, Droplet, CreditCard, AlertTriangle } from 'lucide-react';

const FaqsSection = () => {
    const [openIndex, setOpenIndex] = useState(0);

    const faqs = [
        {
            icon: CreditCard,
            question: "How are my water rates calculated?",
            answer: (
                <div className="space-y-4">
                    <p>The water rates of the Maragondon Water District are based on the water tariff provided by the Local Water Utilities Administration (LWUA). The rates vary according to consumer category and volume of water consumption.</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-600 border border-gray-200 rounded-lg">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-2 font-bold">Category</th>
                                    <th className="px-4 py-2 font-bold">Minimum Charge (1st 10 cu.m.)</th>
                                    <th className="px-4 py-2 font-bold">11-20 cu.m.</th>
                                    <th className="px-4 py-2 font-bold">21-30 cu.m.</th>
                                    <th className="px-4 py-2 font-bold">31-40 cu.m.</th>
                                    <th className="px-4 py-2 font-bold">41-50 cu.m.</th>
                                    <th className="px-4 py-2 font-bold">51 cu.m. & above</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-white">
                                    <td className="px-4 py-2 font-medium">Residential / Gov't</td>
                                    <td className="px-4 py-2">₱185.00</td>
                                    <td className="px-4 py-2">₱19.80</td>
                                    <td className="px-4 py-2">₱21.45</td>
                                    <td className="px-4 py-2">₱23.70</td>
                                    <td className="px-4 py-2">₱26.45</td>
                                    <td className="px-4 py-2">₱29.75</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-4 py-2 font-medium">Commercial</td>
                                    <td className="px-4 py-2">₱370.00</td>
                                    <td className="px-4 py-2">₱39.60</td>
                                    <td className="px-4 py-2">₱42.90</td>
                                    <td className="px-4 py-2">₱47.40</td>
                                    <td className="px-4 py-2">₱52.90</td>
                                    <td className="px-4 py-2">₱59.50</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-2 font-medium">Commercial A</td>
                                    <td className="px-4 py-2">₱323.75</td>
                                    <td className="px-4 py-2">₱34.65</td>
                                    <td className="px-4 py-2">₱37.54</td>
                                    <td className="px-4 py-2">₱41.48</td>
                                    <td className="px-4 py-2">₱46.28</td>
                                    <td className="px-4 py-2">₱52.06</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-4 py-2 font-medium">Commercial B</td>
                                    <td className="px-4 py-2">₱277.50</td>
                                    <td className="px-4 py-2">₱29.70</td>
                                    <td className="px-4 py-2">₱32.18</td>
                                    <td className="px-4 py-2">₱35.55</td>
                                    <td className="px-4 py-2">₱39.67</td>
                                    <td className="px-4 py-2">₱44.62</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-2 font-medium">Commercial C</td>
                                    <td className="px-4 py-2">₱231.25</td>
                                    <td className="px-4 py-2">₱24.75</td>
                                    <td className="px-4 py-2">₱26.81</td>
                                    <td className="px-4 py-2">₱29.62</td>
                                    <td className="px-4 py-2">₱33.06</td>
                                    <td className="px-4 py-2">₱37.18</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        },
        {
            icon: AlertTriangle,
            question: "How are penalties for late payments calculated?",
            answer: "The Maragondon Water District applies a flat 15% penalty on the total water bill for late payments. This penalty is imposed immediately after the due date of the bill. The 15% charge is calculated based on the total amount due, including any previous outstanding balances. This policy is designed to encourage timely payment and support the financial sustainability of the water district."
        },
        {
            icon: CreditCard,
            question: "Does the water district offer discounts for Senior Citizens or PWDs?",
            answer: "The Maragondon Water District provides a Senior Citizen Discount as the only available discount for consumers. The discount is 5% of the total water bill. To qualify, the senior citizen's water consumption must not exceed 30 cubic meters during the billing period. Eligible customers must submit necessary documents to our office for verification."
        },
        {
            icon: Droplet,
            question: "Are there rewards for early payments or water conservation?",
            answer: "No, the Maragondon Water District does not currently offer any rewards, incentives, or discounts for consumers who pay early or conserve water."
        },
        {
            icon: Clock,
            question: "What are your office hours?",
            answer: "Our personnel is fully committed to serving concessionaires from Monday to Friday, from 8:00 AM to 5:00 PM with absolutely NO NOON BREAK. Our front-line staff is trained to aid customers to complete transactions within the day."
        },
        {
            icon: MapPin,
            question: "What barangays are covered by your service area?",
            answer: "We currently serve 15 barangays in Maragondon: Poblacion 1-A, Poblacion 1-B, Poblacion 2-A, Poblacion 2-B, Caingin, Garita A, Garita B, Bucal 1, Bucal 2, Bucal 3-A, Bucal 3-B, Bucal 4-A, Bucal 4-B, San Miguel A, and San Miguel B."
        },
        {
            icon: HelpCircle,
            question: "How can I report a water outage or a leak?",
            answer: "You can report outages, leaks, or other concerns directly through our online AGWA portal. Our platform features a Sociotechnical Peer-to-Peer Forum designed for community-reported outages. Our Customer Service and Technical teams continuously monitor this platform to ensure fast response."
        },
        {
            icon: HelpCircle,
            question: "What department handles my billing concerns?",
            answer: "All billing, meter reading, collection, and customer service inquiries are handled by our Financial and Commercial Services Division. They are responsible for monitoring consumption, preparing bills, processing payments, and maintaining accurate accounts."
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
            <div className="text-center mb-12">
                <HelpCircle size={48} className="mx-auto text-blue-600 mb-4" />
                <h1 className="text-4xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
                <p className="text-lg text-gray-600">Find answers to common questions about Maragondon Water District policies, billing, and services.</p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, index) => {
                    const Icon = faq.icon;
                    return (
                        <div 
                            key={index} 
                            className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${openIndex === index ? 'border-blue-400 shadow-lg ring-2 ring-blue-50' : 'border-gray-200 hover:border-blue-200 hover:shadow-md'}`}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                                className="w-full text-left px-6 py-5 flex justify-between items-center focus:outline-none"
                            >
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-lg mr-4 ${openIndex === index ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <span className={`font-semibold text-lg ${openIndex === index ? 'text-blue-800' : 'text-gray-800'}`}>
                                        {faq.question}
                                    </span>
                                </div>
                                <div className={`ml-4 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'transform rotate-180 text-blue-600' : 'text-gray-400'}`}>
                                    <ChevronDown size={20} />
                                </div>
                            </button>
                            
                            <div 
                                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-[1000px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="text-gray-600 pt-4 border-t border-gray-100 pl-14">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 text-center shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
                <p className="text-gray-600 mb-6 max-w-xl mx-auto">Our Customer Service team is ready to help you with any specific concerns regarding your account or our services. We are open Monday to Friday, 8:00 AM to 5:00 PM.</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors shadow-md">
                    Contact Support
                </button>
            </div>
        </div>
    );
};

export default FaqsSection;