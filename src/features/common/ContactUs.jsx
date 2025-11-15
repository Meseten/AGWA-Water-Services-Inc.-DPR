import React, { useState } from 'react';
import { PhoneCall, Mail, Building2, MapPin, Facebook, X, Instagram, MessageSquare, Clock } from 'lucide-react';
import TermsModal from './TermsModal.jsx';
import PrivacyModal from './PrivacyModal.jsx';

const SocialIcon = ({ type, href }) => {
    let IconComponent;
    let hoverColor = 'hover:text-blue-700';

    switch (type) {
        case 'Facebook':
            IconComponent = Facebook;
            hoverColor = 'hover:text-blue-600';
            break;
        case 'X':
            IconComponent = X;
            hoverColor = 'hover:text-black';
            break;
        case 'Instagram':
            IconComponent = Instagram;
            hoverColor = 'hover:text-pink-600';
            break;
        default:
            return null;
    }
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-gray-500 transition-colors duration-200 ${hoverColor}`}
            title={type}
        >
            <IconComponent size={28} />
        </a>
    );
};


const ContactUsSection = ({ systemSettings = {} }) => {
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const { 
        supportHotline = "1627-AGWA (24/7 Emergency)",
        supportEmail = "support@agwa.ph"
    } = systemSettings;

    const contactDetails = [
        {
            icon: PhoneCall,
            title: "Customer Service Hotlines",
            lines: [
                { text: supportHotline, valueClass: "text-2xl font-semibold text-blue-700 tracking-tight" },
                { text: "(+63 2) 8162-2492 (Outside Metro Manila / Standard Hours)", valueClass: "text-lg text-gray-700" }
            ],
            note: "Emergency reports are handled 24/7. General inquiries: Mon - Fri, 8 AM - 5 PM PHT.",
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600"
        },
        {
            icon: Mail,
            title: "Email Support",
            lines: [
                { text: supportEmail, valueClass: "text-lg text-green-700 hover:underline" }
            ],
            note: "For general inquiries, billing concerns, feedback, and non-urgent requests. Expect a response within 1-2 business days.",
            href: `mailto:${supportEmail}`,
            bgColor: "bg-green-50",
            iconColor: "text-green-600"
        }
    ];

    const officeInfo = {
        icon: Building2,
        title: "AGWA Head Office",
        addressLines: [
            "AGWA Water Services Bldg.",
            "Governor's Drive, Brgy. Ibayo Silangan",
            "Naic, Cavite, Philippines 4110"
        ],
        hours: "Mon - Fri, 8:00 AM - 5:00 PM PHT (Closed on weekends & public holidays)",
        note: "Walk-ins are welcome for payments and specific services. For complex concerns, an appointment is recommended to ensure specialist availability.",
        mapLink: "https://www.google.com/maps/place/Naic,+Cavite/",
        bgColor: "bg-gray-100",
        iconColor: "text-gray-600"
    };

    const socialMediaLinks = [
        { type: 'Facebook', href: 'https://facebook.com/AGWAwaterservices' },
        { type: 'X', href: 'https://x.com/AGWAwaterserv' },
        { type: 'Instagram', href: 'https://instagram.com/AGWAwater' }
    ];

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <MessageSquare size={30} className="mr-3 text-blue-600" />
                    Get In Touch With AGWA
                </h2>
            </div>

            <p className="text-gray-700 mb-8 leading-relaxed text-sm sm:text-base">
                We value your feedback and are dedicated to assisting you with your water service needs. For immediate assistance, especially during emergencies like major leaks or widespread service interruptions, please use our 24/7 hotline. For other inquiries, choose the most convenient channel below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {contactDetails.map((contact, index) => {
                    const Icon = contact.icon;
                    return (
                        <div key={index} className={`p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow ${contact.bgColor} border border-gray-200`}>
                            <div className="flex items-start mb-3">
                                <Icon size={28} className={`mr-4 mt-1 flex-shrink-0 ${contact.iconColor}`} />
                                <div>
                                    <h3 className={`text-lg font-semibold ${contact.iconColor}`}>{contact.title}</h3>
                                    {contact.lines.map((line, idx) => (
                                        contact.href && idx === 0 ? (
                                            <a key={idx} href={contact.href} className={line.valueClass}>{line.text}</a>
                                        ) : (
                                            <p key={idx} className={line.valueClass}>{line.text}</p>
                                        )
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 leading-normal">{contact.note}</p>
                        </div>
                    );
                })}
            </div>

            <div className={`p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow mb-8 ${officeInfo.bgColor} border border-gray-200`}>
                <div className="flex items-start mb-3">
                    <Building2 size={28} className={`mr-4 mt-1 flex-shrink-0 ${officeInfo.iconColor}`} />
                    <div>
                        <h3 className={`text-lg font-semibold ${officeInfo.iconColor}`}>{officeInfo.title}</h3>
                        {officeInfo.addressLines.map((line, idx) => (
                            <p key={idx} className="text-sm text-gray-700 leading-snug">{line}</p>
                        ))}
                    </div>
                </div>
                <div className="text-sm text-gray-600 space-y-2 mt-3">
                    <div className="flex items-center">
                        <Clock size={14} className="mr-2.5 text-gray-500 flex-shrink-0"/>
                        <span className="font-semibold w-24">Hours:</span>
                        <span>{officeInfo.hours}</span>
                    </div>
                    <div className="flex items-start">
                        <MapPin size={14} className="mr-2.5 mt-0.5 text-gray-500 flex-shrink-0"/>
                        <span className="font-semibold w-24">Location Note:</span>
                        <span>{officeInfo.note}</span>
                    </div>
                </div>
                <a
                    href={officeInfo.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                    View on Map <MapPin size={12} className="ml-1" />
                </a>
            </div>

            <div className="mt-10 text-center border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Stay Connected</h3>
                <p className="text-sm text-gray-600 mb-5 max-w-md mx-auto">
                    Follow us on our official social media channels for the latest news, service advisories, water conservation tips, and community program updates.
                </p>
                <div className="flex justify-center space-x-6 sm:space-x-8">
                    {socialMediaLinks.map(social => (
                        <SocialIcon key={social.type} type={social.type} href={social.href} />
                    ))}
                </div>
                
                <p className="mt-8 text-xs text-gray-500">
                    For more details, review our{' '}
                    <button type="button" onClick={() => setShowTerms(true)} className="font-medium text-blue-600 hover:underline">
                        Terms of Service
                    </button>
                    {' & '}
                    <button type="button" onClick={() => setShowPrivacy(true)} className="font-medium text-blue-600 hover:underline">
                        Data Privacy Notice
                    </button>.
                </p>
                <p className="text-center text-xs text-gray-400 mt-4">
                    © {new Date().getFullYear()} AGWA Water Services, Inc. All Rights Reserved.
                </p>
            </div>

            <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
            <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        </div>
    );
};

export default ContactUsSection;