import React from 'react';
import { Droplets, ShieldCheck, Target, HeartHandshake, Map, Award, BookOpen, Clock } from 'lucide-react';

const AboutUsSection = () => {
    const values = [
        { label: "Professionalism", desc: "Officials and employees shall perform and discharge their duties with the highest degree of excellence, professionalism, intelligence and skill. They shall function with utmost devotion and dedication to duty and serious desire for continuous self-improvement." },
        { label: "Competence & Efficiency", desc: "Services shall be delivered with proficiency or in a manner that is responsive to the needs of clients. These services are delivered adeptly, combining technical knowledge, appropriate skills and professional attitude to satisfy clients." },
        { label: "Environmentally Conscious", desc: "Officials and employees shall perform and discharge their duties with conscious effort to conserve resources in order to set examples for environmentally friendly actions and procedures to promote environmental conservation and protection." }
    ];

    const objectives = [
        "Ensure customer satisfaction through high customer service standards.",
        "Delivering potable water to customers with no interruptions.",
        "Develop, improve and implement policies and standards for service excellence.",
        "Ensure constant development of water service facilities and operations.",
        "Utilization of technologies for continuous improvement of water service."
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
            <div className="text-center mb-16 mt-8">
                <img src="/mwdlogo.png" alt="Maragondon Water District Logo" className="mx-auto h-32 w-auto mb-6 drop-shadow-md rounded-full" />
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Maragondon Water District</h1>
                <p className="text-xl text-blue-700 font-semibold italic mb-6">Buhay ay Kayamanan</p>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                    Maragondon Water District aims to become a water service provider that will help uplift the quality of life of the people through superior and efficient service in its service area as well as the protection and conservation of the environment.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-sm border border-blue-100 p-8">
                    <div className="flex items-center mb-4">
                        <Target className="w-8 h-8 text-blue-600 mr-3" />
                        <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-lg font-medium">
                        To be the most efficient & reliable water service provider in Cavite, ensuring high quality service to its customers.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-sm border border-indigo-100 p-8">
                    <div className="flex items-center mb-4">
                        <ShieldCheck className="w-8 h-8 text-indigo-600 mr-3" />
                        <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
                    </div>
                    <ul className="space-y-3 text-gray-700 leading-relaxed">
                        <li className="flex items-start"><div className="w-2 h-2 mt-2 bg-indigo-500 rounded-full mr-3 flex-shrink-0"></div>Deliver quality services through competent & committed personnel</li>
                        <li className="flex items-start"><div className="w-2 h-2 mt-2 bg-indigo-500 rounded-full mr-3 flex-shrink-0"></div>Provide sufficient potable water 24/7 through a responsible water service at reasonable cost</li>
                        <li className="flex items-start"><div className="w-2 h-2 mt-2 bg-indigo-500 rounded-full mr-3 flex-shrink-0"></div>Utilize & develop technologies & facilities for the improvement & continuous delivery of potable Water service to customers</li>
                    </ul>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-16">
                <div className="flex flex-col md:flex-row gap-12">
                    <div className="md:w-1/3">
                        <div className="sticky top-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
                                <Award className="w-8 h-8 text-blue-600 mr-3" /> Core Values
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                The following values are most important to the district as we continuously serve the community.
                            </p>
                        </div>
                    </div>
                    <div className="md:w-2/3 space-y-8">
                        {values.map((value, idx) => (
                            <div key={idx} className="border-l-4 border-blue-500 pl-6 py-2 bg-gray-50 rounded-r-xl pr-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.label}</h3>
                                <p className="text-gray-600 leading-relaxed">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-8 -translate-y-8">
                        <HeartHandshake size={240} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold mb-6 border-b border-blue-400 pb-4">Service Pledge</h3>
                        <p className="text-blue-50 leading-relaxed mb-6 text-lg">
                            We at Maragondon Water District commit to provide clean, potable and safe water to its service area 24/7. Our personnel is fully committed to serving its concessionaires from Monday to Friday from 8:00 AM to 5:00 PM with no noon break.
                        </p>
                        <p className="text-blue-50 leading-relaxed mb-6">
                            It is our pledge to provide the best customer service in terms of action on customer complaints, inquiries and requests, with our front-line staff trained to serve and aid our customers to complete their transactions with our office within the day.
                        </p>
                        <p className="text-blue-50 leading-relaxed font-semibold">
                            We pledge to work for the best interest of our concessionaires for the improvement of our water district and the community that we serve.
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                            <BookOpen className="w-6 h-6 text-blue-600 mr-3" /> Mandate
                        </h2>
                        <p className="text-gray-600 leading-relaxed">
                            As per Sec. 5 of Title II of PD 198, water districts are mandated to do the following functions: acquiring, installing, improving, maintaining and operating water supply and distribution systems; providing wastewater collection and treatment; and conducting other operations incidental to water resources development.
                        </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Strategic Objectives</h2>
                        <ul className="space-y-3">
                            {objectives.map((obj, i) => (
                                <li key={i} className="flex items-start">
                                    <div className="text-blue-500 mr-3 mt-1 font-bold">✓</div>
                                    <span className="text-gray-700">{obj}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-200 pt-16">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Our History & Accomplishments</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">From our foundation to our current expansions, we continuously strive for better service.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-blue-600 mb-4"><Clock size={32} /></div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Foundation</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Created on November 12, 1991 by Sangguniang Bayan Resolution No. 31-91. It was formed by merging two previously existing water systems (MRWSA and Bucal II, III and IV RWSA) established under Mayor Paulito Unas and Governor Juanito Remulla.
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-blue-600 mb-4"><Map size={32} /></div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Area of Coverage</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Originally servicing 13 barangays in Maragondon. Today, we have expanded to serve 15 barangays, adding San Miguel A and B, increasing our pipeline reach significantly.
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-blue-600 mb-4"><Droplets size={32} /></div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Growth & Infrastructure</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            From just two production wells, we now operate four active production wells (Poblacion, Bucal IV, Bucal II, and Garita). Active connections have grown from 1,849 in year 2000 to nearly 4,000 today.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutUsSection;