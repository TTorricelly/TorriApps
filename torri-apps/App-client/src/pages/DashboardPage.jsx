import React from 'react'
import HomePage from './HomePage'
import BottomNavigation from '../components/BottomNavigation'

const DashboardPage = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <HomePage />
      </div>
      <BottomNavigation />
    </div>
  )
}

export default DashboardPage