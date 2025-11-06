import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea'; // Assume que você tem um componente Textarea
import { Send } from 'lucide-react';
import { toast } from '../components/ui/toast';
import { feedbacksService } from '../services/api.js'; // Ajuste o caminho conforme necessário

const EnviarFeedback = ({ isOpen, setIsOpen }) => {
    const [descricao, setDescricao] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (descricao.length < 10) {
            toast.error('O feedback deve ter pelo menos 10 caracteres.');
            return;
        }

        setIsSubmitting(true);
        try {
            await feedbacksService.enviarFeedback(descricao);
            
            toast.success('Feedback enviado! Agradecemos sua contribuição.');
            setDescricao(''); // Limpa o formulário
            setIsOpen(false); // Fecha o modal

        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
            const msg = error.message || 'Falha ao enviar o feedback. Tente novamente.';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Enviar Feedback ou Relatar Problema</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="descricao">Descreva sua sugestão ou problema:</Label>
                        <Textarea
                            id="descricao"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Ex: A pontuação da prova X está incorreta."
                            rows={5}
                            required
                        />
                        <p className="text-sm text-gray-500">Máximo de 10000 caracteres.</p>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting || descricao.length < 10} className="bg-blue-600 hover:bg-blue-700">
                            <Send className="h-4 w-4 mr-2" /> 
                            {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EnviarFeedback;