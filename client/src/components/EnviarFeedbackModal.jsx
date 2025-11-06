// src/components/FeedbackFAB.jsx

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import EnviarFeedback from '../pages/EnviarFeedback';

const FeedbackFAB = () => {
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    return (
        <>
            {/* Botão Flutuante */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    title="Enviar Feedback ou Relatar Problema"
                    className="p-4 bg-purple-600 text-white rounded-full shadow-2xl hover:bg-purple-700 transition duration-150 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                >
                    <MessageSquare size={28} />
                </button>
            </div>

            {/* Modal de Feedback */}
            <EnviarFeedback 
                isOpen={isFeedbackModalOpen} 
                setIsOpen={setIsFeedbackModalOpen} 
            />
        </>
    );
};

export default FeedbackFAB;