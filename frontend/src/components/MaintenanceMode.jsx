import { FiTool, FiAlertTriangle } from 'react-icons/fi'

export default function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
              <div className="relative bg-dark-700 p-6 rounded-full">
                <FiTool className="w-12 h-12 text-primary-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-3">Site en maintenance</h1>
          
          <div className="flex items-center justify-center gap-2 mb-6 text-yellow-500">
            <FiAlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">Maintenance en cours</p>
          </div>
          
          <p className="text-dark-300 mb-6">
            Nous effectuons actuellement une maintenance pour améliorer votre expérience. 
            Le site sera de nouveau accessible très prochainement.
          </p>
          
          <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
            <p className="text-sm text-dark-400">
              Merci de votre patience et de votre compréhension.
            </p>
          </div>
        </div>
        
        <p className="text-dark-500 text-sm mt-6">
          Pour toute urgence, contactez l'administrateur
        </p>
      </div>
    </div>
  )
}
