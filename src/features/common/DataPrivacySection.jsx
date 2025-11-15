import React from 'react';
import { Eye, Shield, Database } from 'lucide-react';

const DataPrivacySection = () => {
    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn leading-relaxed text-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Eye size={30} className="mr-3 text-blue-600" />
                    Data Privacy Notice
                </h2>
            </div>
            
            <p className="mb-4 text-sm text-gray-500">Last Updated: November 15, 2025</p>

            <div className="prose prose-sm max-w-none">
                <h4>Our Commitment to Privacy</h4>
                <p>
                    AGWA Water Services, Inc. ("AGWA", "we", "us", "our") is committed to protecting your privacy in compliance with
                    Republic Act No. 10173, the Data Privacy Act of 2012 (DPA), its Implementing Rules
                    and Regulations (IRR), and other relevant data privacy and protection laws.
                </p>
                <p>
                    This notice explains how we collect, use, disclose, process, store, and protect your personal data when you
                    use our Customer Portal ("Portal") and our services.
                </p>

                <h4>1. What Personal Information We Collect</h4>
                <p>
                    We collect, store, and process your personal information when you register for an account,
                    use our services, pay your bills, or interact with our customer support. This information may include:
                </p>
                <ul>
                    <li>
                        <strong>Personal Identification Data:</strong> Full name, email address, phone number, and service address.
                    </li>
                    <li>
                        <strong>Account and Service Data:</strong> AGWA Account Number, meter serial number, service type,
                        account status, and account creation date.
                    </li>
                    <li>
                        <strong>Financial and Transaction Data:</strong> Billing history, payment history, consumption data (meter readings),
                        payment method details (which are securely tokenized and processed by our third-party payment partners),
                        and rebate point information.
                    </li>
                    <li>
                        <strong>Communication Data:</strong> Records of your correspondence with us, such as support tickets,
                        chat logs, and issue reports.
                    </li>
                    <li>
                        <strong>Technical Data:</strong> IP address, device type, browser information, and portal usage data, collected
                        automatically when you interact with the Portal for security and analytics purposes.
                    </li>
                </ul>

                <h4>2. How We Use Your Information</h4>
                <p>Your personal data is used for the following legitimate business purposes:</p>
                <ul>
                    <li>To create, maintain, and secure your AGWA Portal account.</li>
                    <li>To provide and manage your water services, including meter reading, billing, and maintenance.</li>
                    <li>To process your bill payments (including card, e-wallet, and rebate point transactions) and manage your account.</li>
                    <li>To respond to your inquiries, concerns, and support tickets, and to provide customer support.</li>
                    <li>To send you essential service advisories, billing reminders, and other system notifications.</li>
                    <li>To manage your participation in programs such as the AGWA Rewards Program.</li>
                    <li>To analyze portal and service usage to improve our operations, services, and user experience.</li>
                    <li>To investigate and prevent fraud, security incidents, or other illegal activities.</li>
                    <li>To comply with our legal and regulatory obligations as a public utility.</li>
                </ul>

                <h4>3. Data Sharing and Disclosure</h4>
                <p>
                    We do not sell or rent your personal information. We may share your data in the following
                    limited circumstances:
                </p>
                <ul>
                    <li>
                        <strong>Third-Party Service Providers:</strong> With trusted partners who perform services on our behalf,
                        such as payment gateways (e.g., Stripe) and cloud data hosting (e.g., Google Cloud/Firebase). These partners
                        are contractually bound to protect your data and use it only for the purposes we specify.
                    </li>
                    <li>
                        <strong>Legal and Regulatory Requirements:</strong> When required by law, such as in response to a
                        subpoena, court order, or formal request from government authorities (e.g., the National Privacy Commission).
                    </li>
                    <li>
                        <strong>Emergency:</strong> To protect the vital interests of any individual, such as during
                        emergencies or service-related safety incidents.
                    </li>
                </ul>

                <h4>4. Data Security and Retention</h4>
                <p>
                    We implement robust technical, physical, and organizational security measures to protect your
                    personal information from unauthorized access, use, alteration, or disclosure. This includes
                    data encryption in transit and at rest, access controls, and secure server environments.
                </p>
                <p>
                    We retain your personal data only for as long as your account is active or as necessary to
                    fulfill the purposes outlined in this notice, and as required by law for auditing and
                    regulatory record-keeping, after which it will be securely disposed of.
                </p>

                <h4>5. Your Rights as a Data Subject</h4>
                <p>In accordance with the Data Privacy Act, you have the right to:</p>
                <ul>
                    <li><strong>Be Informed</strong> that your personal data will be, are being, or were processed.</li>
                    <li><strong>Access</strong> your personal information we hold.</li>
                    <li><strong>Rectify</strong> any inaccuracies or errors in your data.</li>
                    <li><strong>Erase or Block</strong> your data from our systems, subject to legal and contractual limitations.</li>
                    <li><strong>Object</strong> to the processing of your personal data.</li>
                    <li><strong>Data Portability</strong> to obtain a copy of your data in a machine-readable format.</li>
                    <li><strong>Lodge a Complaint</strong> with the National Privacy Commission (NPC) if you feel
                        your data privacy rights have been violated.
                    </li>
                </ul>

                <h4>6. Contacting Us</h4>
                <p>
                    To exercise any of these rights or if you have any questions about this privacy notice,
                    please contact our Data Privacy Officer at:
                </p>
                <p>
                    <strong>Email:</strong> <a href="mailto:dpo@agwa.ph">dpo@agwa-waterservices.com.ph</a><br/>
                    <strong>Email:</strong> <a href="mailto:benjamesduag.edu@gmail.com">benjamesduag.edu@gmail.com</a><br/>
                    <strong>Address:</strong> Attn: Data Privacy Officer, AGWA Water Services Bldg., Governor's Drive, Brgy. Ibayo Silangan, Naic, Cavite 4110
                </p>

                <h4>7. Changes to This Notice</h4>
                <p>
                    We may update this Data Privacy Notice from time to time. We will notify you of any
                    significant changes by posting the new notice on this page and updating the "Last Updated" date.
                </p>
            </div>
        </div>
    );
};

export default DataPrivacySection;