"use client"

import { useState } from "react"
import PatientList from "@/components/patients/patient-list"
import MedicalReports from "@/components/reports/medical-reports"

export default function ExpedientesPage() {
  const [activeTab, setActiveTab] = useState("patients")

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("patients")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "patients"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Pacientes
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Reportes
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "patients" ? <PatientList /> : <MedicalReports />}
    </div>
  )
}
