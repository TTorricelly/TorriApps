import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';

const ComingSoonPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <Wrench size={40} className="text-orange-600" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
          Funcionalidade será implementada em breve
        </h1>
        
        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Esta funcionalidade está em desenvolvimento e estará disponível em uma próxima atualização.
        </p>
        
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          className="inline-flex items-center space-x-2 bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
      </div>
    </div>
  );
};

export default ComingSoonPage;