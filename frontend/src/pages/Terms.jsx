import { Link } from 'react-router-dom'
import { FiArrowLeft, FiPlay, FiCheck } from 'react-icons/fi'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-dark-800 bg-dark-900/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FiPlay className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">TIPOKO</span>
          </Link>
          <Link 
            to="/register" 
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors text-sm"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-dark-900/50 backdrop-blur-sm border border-dark-800 rounded-2xl p-6 sm:p-8 lg:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Conditions d'utilisation</h1>
          <p className="text-dark-400 mb-8">Dernière mise à jour : 24 décembre 2025</p>

          <div className="space-y-8 text-dark-200">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">1</span>
                Acceptation des conditions
              </h2>
              <p className="text-dark-300 leading-relaxed">
                En accédant et en utilisant TIPOKO, vous acceptez d'être lié par ces conditions d'utilisation. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">2</span>
                Création de compte
              </h2>
              <div className="space-y-3 text-dark-300">
                <p className="leading-relaxed">
                  Pour utiliser certaines fonctionnalités de TIPOKO, vous devez créer un compte. Vous vous engagez à :
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Fournir des informations exactes et à jour</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Maintenir la sécurité de votre mot de passe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Ne pas partager votre compte avec d'autres personnes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Nous informer immédiatement de toute utilisation non autorisée</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">3</span>
                Contenu utilisateur
              </h2>
              <div className="space-y-3 text-dark-300">
                <p className="leading-relaxed">
                  Vous êtes responsable du contenu que vous publiez sur TIPOKO. Vous garantissez que :
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Vous détenez les droits nécessaires sur votre contenu</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Votre contenu ne viole pas les droits de tiers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Votre contenu respecte les lois en vigueur</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Votre contenu ne contient pas de matériel offensant ou illégal</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">4</span>
                Comportement interdit
              </h2>
              <div className="space-y-3 text-dark-300">
                <p className="leading-relaxed">Il est strictement interdit de :</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span>Harceler, menacer ou intimider d'autres utilisateurs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span>Publier du contenu haineux, violent ou pornographique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span>Usurper l'identité d'une autre personne</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span>Tenter d'accéder aux comptes d'autres utilisateurs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span>Diffuser des virus ou du code malveillant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                    <span>Utiliser des bots ou des scripts automatisés</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">5</span>
                Propriété intellectuelle
              </h2>
              <p className="text-dark-300 leading-relaxed">
                TIPOKO et son contenu original (design, logo, code, etc.) sont protégés par le droit d'auteur et 
                d'autres lois sur la propriété intellectuelle. En publiant du contenu sur TIPOKO, vous nous accordez 
                une licence mondiale, non exclusive et gratuite pour utiliser, reproduire et distribuer votre contenu 
                sur notre plateforme.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">6</span>
                Limitation de responsabilité
              </h2>
              <p className="text-dark-300 leading-relaxed">
                TIPOKO est fourni "tel quel" sans garantie d'aucune sorte. Nous ne sommes pas responsables des 
                dommages directs, indirects, accessoires ou consécutifs résultant de l'utilisation ou de l'impossibilité 
                d'utiliser notre service.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">7</span>
                Modifications des conditions
              </h2>
              <p className="text-dark-300 leading-relaxed">
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entreront 
                en vigueur dès leur publication sur cette page. Votre utilisation continue de TIPOKO après la publication 
                des modifications constitue votre acceptation des nouvelles conditions.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">8</span>
                Résiliation
              </h2>
              <p className="text-dark-300 leading-relaxed">
                Nous nous réservons le droit de suspendre ou de résilier votre compte à tout moment, sans préavis, 
                si nous estimons que vous avez violé ces conditions d'utilisation.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400">9</span>
                Contact
              </h2>
              <p className="text-dark-300 leading-relaxed">
                Pour toute question concernant ces conditions d'utilisation, veuillez nous contacter à l'adresse : 
                <a href="mailto:contact@tipoko.bf" className="text-primary-400 hover:text-primary-300 ml-1">
                  contact@tipoko.bf
                </a>
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-dark-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-dark-400 text-sm text-center sm:text-left">
                © 2025 TIPOKO. Tous droits réservés.
              </p>
              <Link 
                to="/register" 
                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-500/25"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
