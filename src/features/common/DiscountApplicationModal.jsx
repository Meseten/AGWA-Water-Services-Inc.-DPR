import React from 'react';
import Modal from '../../components/ui/Modal';
import { Mail, Building2, Upload, Loader2, Info } from 'lucide-react';

const DiscountApplicationModal = ({ isOpen, onClose, onSubmit, isSaving }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Apply for Senior/PWD Discount" size="lg">
            <div className="space-y-6">
                <p className="text-sm text-gray-600">
                    To apply for your Senior Citizen or PWD discount, you must provide a valid ID for verification.
                    Please choose one of the following methods to submit your application.
                </p>

                <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Mail size={18} className="mr-2 text-blue-600" />
                        Option 1: Online Submission (Email)
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Email a clear photo of your valid Senior Citizen or PWD ID to our verification team.
                    </p>
                    <ul className="text-sm space-y-1 mb-3">
                        <li><strong>To:</strong> <a href="mailto:admin@agwa.ph" className="text-blue-600 hover:underline">admin@agwa.ph</a></li>
                        <li><strong>Cc:</strong> <a href="mailto:benjamesduag.edu@gmail.com" className="text-blue-600 hover:underline">benjamesduag.edu@gmail.com</a></li>
                        <li><strong>Subject:</strong> Discount Application - {`{Your Account Number}`}</li>
                    </ul>
                    <p className="text-xs text-gray-500 bg-yellow-50 p-2 border border-yellow-200 rounded-md">
                        After emailing, click "Submit Application" below. Our team will review your email and update your account status within 2-3 business days.
                    </p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-800 flex items-center mb-2">
                        <Building2 size={18} className="mr-2 text-green-600" />
                        Option 2: In-Person Verification
                    </h3>
                    <p className="text-sm text-gray-600">
                        Visit any AGWA business office and present your valid ID to a customer service representative.
                        Your account will be updated on the spot.
                    </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        onClick={onSubmit}
                        className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Upload size={18} className="mr-2" />}
                        {isSaving ? 'Submitting...' : 'Submit Application (Set to Pending)'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DiscountApplicationModal;