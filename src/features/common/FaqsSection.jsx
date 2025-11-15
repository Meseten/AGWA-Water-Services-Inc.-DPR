import React from 'react';
import { HelpCircle, ChevronDown, ShieldQuestion } from 'lucide-react';
import DOMPurify from 'dompurify';

const faqsData = [
    { 
        id: "group-account",
        title: "Account Management & Portal Features"
    },
    { 
        q: "How do I register for an online account?", 
        a: `<p>You can create an account by following these steps:</p>
            <ol>
                <li>On the login page, click the "Sign Up" button.</li>
                <li>Fill in the required information: your full name, your AGWA account number (found on your paper bill), a valid email address, and a secure password (minimum 6 characters).</li>
                <li>Read and accept the Terms of Service and Data Privacy Notice.</li>
                <li>Click "Create My Account". You may be asked to verify your email address.</li>
            </ol>` 
    },
    { 
        q: "I forgot my password. How can I reset it?", 
        a: `<p>You can easily reset your password:</p>
            <ol>
                <li>On the login page, click the "Forgot Password?" link.</li>
                <li>Enter the email address associated with your AGWA account.</li>
                <li>Click "Send Password Reset Link".</li>
                <li>Check your email inbox (and spam folder) for an email from us. Click the link inside to create a new password.</li>
            </ol>`
    },
    { 
        q: "How do I update my profile information?", 
        a: "<p>Once logged in, navigate to the 'My Profile' section. You can edit your Display Name, Photo URL, and Service Address. For security, critical information like your email address or registered account number cannot be changed directly. Please contact customer service for assistance with those items.</p>" 
    },
    { 
        q: "Is my personal and payment information secure on this portal?", 
        a: "<p>Yes. We take your privacy and security seriously. All data is transmitted over a secure (SSL) connection, and sensitive information is encrypted. Payment transactions are handled by our trusted, PCI-compliant payment partners. For more details, please review our Data Privacy Notice.</p>" 
    },
    { 
        q: "Can I manage multiple AGWA accounts with one portal login?", 
        a: "<p>Currently, the portal is designed to link one portal login (email address) to one AGWA account number. If you manage multiple properties, you will need to register a separate portal login for each unique account number. We are working on a feature to allow management of multiple accounts under a single login in the future.</p>" 
    },
    { 
        q: "How do I update my contact number or service address on file?", 
        a: "<p>You can update your Service Address directly in the 'My Profile' section. For changes to your primary contact number, it's best to contact AGWA customer service or visit one of our business offices to ensure your records are accurately updated and verified across all our systems.</p>" 
    },
    { 
        q: "I am moving out/sold my property. How do I transfer the account name?", 
        a: "<p>Account name transfers require a formal request at an AGWA business office. The new owner/tenant must be present and provide their valid ID, proof of ownership or lease contract, and sign a new service contract. The original account holder should ensure all outstanding bills are settled before the transfer can be processed.</p>" 
    },
    { 
        q: "Are there discounts for senior citizens or Persons with Disabilities (PWDs)?", 
        a: "<p>Yes, AGWA adheres to R.A. No. 9994 (Expanded Senior Citizens Act) and R.A. No. 10754 (Act Expanding the Benefits and Privileges of Persons with Disability). Qualified customers are entitled to a discount on their water consumption, provided the account is registered in their name and consumption is within prescribed limits. You can apply for this discount via the 'My Profile' section in the portal, which will set your status to 'Pending' for verification by our team.</p>" 
    },
    { 
        id: "group-billing",
        title: "Billing, Payments, & Charges"
    },
    { 
        q: "How can I pay my water bill through this portal?", 
        a: `<p>You can simulate a payment by following these steps:</p>
            <ol>
                <li>Navigate to the "My Bills" section.</li>
                <li>Find an "Unpaid" bill you wish to pay and click the "Pay Now" or "Pay with Card" button.</li>
                <li>You will be shown a summary of the amount due. (Note: This is a demo. No real payment will be processed).</li>
                <li>If you have enough points, a "Pay with Points" button will also appear.</li>
                <li>Follow the on-screen prompts to complete the simulated payment.</li>
            </ol>
            <p><strong>For actual payments</strong>, please use AGWA's officially accredited payment channels listed on your paper bill or our main website.</p>`
    },
    { 
        q: "Why is my water bill suddenly so high?", 
        a: "<p>A sudden increase in your bill is almost always caused by high consumption, which can have two common sources:</p>\n<ul>\n<li><strong>Actual Usage:</strong> A recent change in water use habits (e.g., new appliances, more people at home, watering a garden).</li>\n<li><strong>A Leak:</strong> The most common culprit is an undetected leak on your property (e.g., a running toilet, a dripping faucet, or a hidden underground pipe leak).</li>\n</ul>\n<p>We highly recommend you check for leaks immediately. You can also use the 'Consumption Analytics' page to see if the high usage is a one-time spike or a consistent trend.</p>" 
    },
    { 
        q: "How is my water consumption calculated?", 
        a: "<p>Your consumption is the difference between your <strong>current meter reading</strong> and your <strong>previous meter reading</strong>, measured in cubic meters (m³). For example, if your previous reading was 1000 m³ and your current reading is 1025 m³, your consumption for the billing period is 25 m³.</p>" 
    },
    { 
        q: "How do I read my own water meter?", 
        a: `<p>Your water meter is usually located at the front of your property near the street. To read it:</p>
            <ol>
                <li>Open the meter cover. You may need to wipe the glass face clean.</li>
                <li>Look at the odometer-style numbers. Read the numbers from left to right.</li>
                <li>The main digits (usually in black or on a white background) represent the reading in cubic meters (m³). This is the value we use for billing.</li>
                <li>The last digits (often in red or on a red background) represent liters or decimals of a cubic meter. You can ignore these for billing purposes (e.g., if you see <strong>00123</strong><span style='color:red;'>456</span>, your reading is 123 m³).</li>
                <li>You can compare this reading to the "Current Reading" on your latest bill to monitor your usage.</li>
            </ol>`
    },
    { 
        q: "What are 'Arrears' or 'Previous Unpaid Balance' on my bill?", 
        a: "<p>This is the total amount due from your previous billing periods that was not paid by the time your new bill was generated. This amount is carried over and added to your 'Total Current Charges' to determine the 'Total Amount Due' on your new bill. Paying this promptly is essential to avoid service disconnection.</p>" 
    },
    { 
        q: "How does the AGWA Rewards Program work?", 
        a: "<p>You earn points for actions like paying your bill on time or paying early (based on settings defined by AGWA). These points accumulate, and 1 point is equivalent to ₱1.00. If you have enough points to cover your <strong>entire</strong> bill, a 'Pay with Points' button will automatically appear as a payment option in the 'My Bills' section.</p>" 
    },
    { 
        q: "What is the 'Explain Bill (AI)' feature?", 
        a: "<p>This is an innovative tool to help you understand your charges. When you click it, our AI assistant 'Agie' analyzes that specific bill's details—your consumption, your service type, and all the individual charges (Basic Charge, FCDA, EC, etc.)—and provides a simple, personalized explanation of how your total amount due was calculated.</p>" 
    },
    { 
        q: "What are the different charges on my bill?", 
        a: "<p>Your bill typically includes a <strong>Basic Charge</strong> (based on consumption), <strong>FCDA</strong> (Foreign Currency Differential Adjustment), <strong>Environmental Charge</strong> (EC), <strong>Sewerage Charge</strong> (if applicable), <strong>Maintenance Service Charge</strong> (based on meter size), <strong>Government Taxes</strong>, and <strong>Value Added Tax (VAT)</strong>. For a personalized breakdown, please use the '✨ Explain Bill (AI)' feature in the 'My Bills' section.</p>" 
    },
    { 
        q: "What if I overpaid my bill?", 
        a: "<p>In the event of an overpayment, the excess amount will automatically be credited to your account. This credit will then be applied to your next month's bill, reducing the amount you need to pay.</p>" 
    },
    { 
        q: "How do I sign up for paperless/e-billing?", 
        a: "<p>By creating an account on this portal, you are automatically enrolled in our paperless billing system. Your new bills will appear in the 'My Bills' section as soon as they are generated. We are also working on an option to send a copy directly to your email.</p>" 
    },
    { 
        q: "How can I get an official receipt (OR) after making a payment?", 
        a: "<p>For payments made through this portal (which are simulated), a transaction reference is provided. For actual payments made via AGWA's accredited channels (e.g., Bayad Center, GCash), an official receipt or proof of payment will be issued by that specific channel. Please keep a copy of that receipt for your records.</p>" 
    },
    { 
        id: "group-service",
        title: "Service, Maintenance, & Water Quality"
    },
    { 
        q: "How do I apply for a new water service connection?", 
        a: `<p>To apply for a new connection, please visit any AGWA business office. You will generally need to follow these steps:</p>
            <ol>
                <li>Attend a pre-application orientation seminar.</li>
                <li>Submit the required documents: Proof of Identification (e.g., valid government ID), Proof of Property Ownership (or a landlord's consent letter if renting), and a proof of billing for the address.</li>
                <li>Fill out the application form.</li>
                <li>Our team will conduct a site inspection to determine the technical requirements.</li>
                <li>Once approved, you will pay the necessary fees (e.g., connection fee, meter deposit).</li>
                <li>Our team will schedule and perform the installation.</li>
            </ol>`
    },
    { 
        q: "My service was disconnected. How do I get reconnected?", 
        a: `<p>To restore your service, you must first settle your total outstanding balance and any applicable fees. Here are the steps:</p>
            <ol>
                <li>Pay your <strong>Total Outstanding Balance</strong>, which includes all unpaid bills, penalties, and the <strong>Reconnection Fee</strong>, at any accredited payment center or AGWA office.</li>
                <li>After payment, please contact our customer service hotline or visit our office with your proof of payment.</li>
                <li>Our team will verify your payment and schedule your reconnection. Reconnection typically occurs within 24-48 business hours after your payment is posted and verified.</li>
            </ol>`
    },
    { 
        q: "What should I do if I suspect a water leak on my property?", 
        a: `<p>A leak can waste a significant amount of water and money. Please act quickly:</p>
            <ol>
                <li>Turn off all water-using appliances and faucets in your home.</li>
                <li>Locate your water meter and check if the small dial or triangle on it is still spinning. If it is, you likely have a leak.</li>
                <li>If it's safe, turn off your main water shut-off valve (usually located near the meter).</li>
                <li>Immediately report the suspected leak to AGWA via the <strong>'Report Issue'</strong> section or by calling our <strong>24/7 emergency hotline: 1627-AGWA</strong>.</li>
            </ol>`
    },
    { 
        q: "I see a leak on the street/sidewalk, not in my house. What should I do?", 
        a: "<p>Please report this to us immediately! This is a main line leak and can cause service interruptions and water loss. Call our 24/7 emergency hotline at <strong>1627-AGWA</strong> with the exact location. You can also use the 'Report Issue' section in the portal (select 'Water Leak (Before Meter)') and provide as much detail as possible about the location.</p>" 
    },
    { 
        q: "My water supply is interrupted. What should I do?", 
        a: "<p>First, please check the 'Service Advisories' section in this portal or our official social media channels for any scheduled maintenance or emergency repairs in your area. If there are no advisories, please report the interruption via the 'Report Issue' section or call our customer service hotline so we can investigate.</p>" 
    },
    { 
        q: "What should I do if my water is discolored (brown, yellow, or cloudy)?", 
        a: "<p>This is often temporary and caused by maintenance or repairs in the main lines which can stir up mineral sediments. Try running your faucet (the one closest to your meter) for a few minutes. If the water does not run clear after 3-5 minutes, or if the issue persists, please report it via the 'Report Issue' section (select 'Water Quality Issue') or our 24/7 hotline.</p>" 
    },
    { 
        q: "What do I do if my water has a strange smell or taste?", 
        a: "<p>Your safety is our priority. Please <strong>do not drink the water</strong>. Call our 24/7 emergency hotline (1627-AGWA) or report it immediately via the 'Report Issue' section. We will dispatch a water quality team to your location to collect a sample and investigate the source of the problem.</p>" 
    },
    { 
        q: "Is my tap water safe to drink?", 
        a: "<p>Yes, the water supplied by AGWA is treated and tested in accordance with the Philippine National Standards for Drinking Water (PNSDW). We conduct regular quality monitoring to ensure it is safe for consumption. However, the quality of water can be affected by the condition of your home's internal plumbing. We recommend you maintain your household pipes and clean your water tanks regularly.</p>" 
    },
    { 
        q: "How can I identify an official AGWA meter reader or employee?", 
        a: "<p>All official AGWA personnel, including meter readers and maintenance crews, are required to wear their official company uniform and a valid AGWA ID card. The ID card must display their photo, name, and employee number. Do not allow anyone without a proper ID to access your property. If in doubt, call our hotline to verify their identity before granting access.</p>" 
    },
    { 
        q: "What is a 'meter deposit' for new service connections?", 
        a: "<p>A meter deposit is a one-time charge collected from customers upon application for a new water service connection. This deposit serves as a security against potential unpaid bills or damages to the water meter. It is refundable, with interest (if applicable by law), upon termination of the service contract, provided all outstanding obligations to AGWA have been settled.</p>" 
    },
    { 
        q: "How do I report a damaged, leaking, or stolen water meter?", 
        a: "<p>Report this immediately. You can use the 'Report Issue' section in this portal (select 'Meter Problem') or call our emergency hotline. Tampering with or unauthorized removal of water meters is illegal and may result in penalties. Please help us protect our equipment by reporting any suspicious activity.</p>" 
    },
    { 
        q: "Can I request for a temporary disconnection of my water service?", 
        a: "<p>Yes, you can request a temporary or voluntary disconnection if you'll be away for an extended period. To do this, please visit any AGWA business office to file a formal request. There may be applicable fees for the disconnection and subsequent reconnection process. Please inquire about the specific requirements and charges when you visit.</p>" 
    }
];


const FaqsSection = () => {
    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <ShieldQuestion size={30} className="mr-3 text-blue-600" />
                    Frequently Asked Questions
                </h2>
            </div>

            <div className="space-y-4">
                {faqsData.map((faq, index) => {
                    if (faq.id && faq.title) {
                        return (
                            <h3 key={faq.id} className="text-xl font-semibold text-blue-700 pt-6 pb-2 border-b border-blue-200">
                                {faq.title}
                            </h3>
                        );
                    }
                    return (
                        <details
                            key={index}
                            className="group bg-gray-50 hover:bg-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out"
                        >
                            <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-900 text-sm sm:text-base">
                                <span className="group-open:text-blue-700 group-open:font-semibold">
                                    {faq.q}
                                </span>
                                <span className="transition-transform duration-300 transform group-open:rotate-180 text-blue-600 group-open:text-blue-700">
                                    <ChevronDown size={24} />
                                </span>
                            </summary>
                            <div className="mt-3 prose prose-sm max-w-none grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                                <div 
                                    className="overflow-hidden prose-p:my-2 prose-ol:my-2 prose-ul:my-2"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faq.a) }} 
                                />
                            </div>
                        </details>
                    );
                })}
            </div>
        </div>
    );
};

export default FaqsSection;