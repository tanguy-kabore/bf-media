import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMenuClick = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar onMenuClick={handleMenuClick} />
      <div className="flex pt-14">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar 
          collapsed={sidebarCollapsed} 
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)} 
        />
        <main className={`flex-1 transition-all duration-300 ${
          isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-60')
        }`}>
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
