import { Link } from 'react-router-dom'
import { FiArrowLeft, FiFileText, FiGithub } from 'react-icons/fi'

export default function License() {
  return (
    <div className="min-h-screen bg-dark-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4">
            <FiArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-500/10 rounded-xl">
              <FiFileText className="w-8 h-8 text-primary-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Licence MIT</h1>
              <p className="text-dark-400">Licence open source du projet TIPOKO</p>
            </div>
          </div>
        </div>

        {/* License Content */}
        <div className="bg-dark-900 rounded-2xl border border-dark-800 overflow-hidden">
          <div className="bg-dark-800/50 px-6 py-4 border-b border-dark-700 flex items-center justify-between">
            <span className="font-mono text-sm text-dark-300">LICENSE</span>
            <a 
              href="https://github.com/tanguy-kabore/bf-media/blob/main/LICENSE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
            >
              <FiGithub className="w-4 h-4" />
              Voir sur GitHub
            </a>
          </div>
          
          <div className="p-6 md:p-8">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-dark-200">
{`MIT License

Copyright (c) 2025 B. Tanguy Kaboré

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
            </pre>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-900 rounded-xl border border-dark-800 p-5">
            <h3 className="font-semibold text-green-400 mb-2">✓ Permissions</h3>
            <ul className="text-sm text-dark-300 space-y-1">
              <li>• Usage commercial</li>
              <li>• Modification</li>
              <li>• Distribution</li>
              <li>• Usage privé</li>
            </ul>
          </div>
          <div className="bg-dark-900 rounded-xl border border-dark-800 p-5">
            <h3 className="font-semibold text-yellow-400 mb-2">⚠ Conditions</h3>
            <ul className="text-sm text-dark-300 space-y-1">
              <li>• Inclure la licence</li>
              <li>• Inclure le copyright</li>
            </ul>
          </div>
          <div className="bg-dark-900 rounded-xl border border-dark-800 p-5">
            <h3 className="font-semibold text-red-400 mb-2">✗ Limitations</h3>
            <ul className="text-sm text-dark-300 space-y-1">
              <li>• Aucune garantie</li>
              <li>• Aucune responsabilité</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-dark-500 text-sm">
          <p>TIPOKO est un projet open source sous licence MIT.</p>
          <p className="mt-1">© 2025 B. Tanguy Kaboré. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  )
}
