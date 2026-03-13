'use client'

import React, { useState } from 'react'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'

export default function UniqueVisitorsSection({ data }) {
  const [open, setOpen] = useState(false)
  const [expandedVisitors, setExpandedVisitors] = useState({})

  const visitors = data?.unique_visitors_list || []
  const visitorPageViews = data?.visitor_page_views || []

  const toggleVisitor = (visitorId) => {
    setExpandedVisitors(prev => ({ ...prev, [visitorId]: !prev[visitorId] }))
  }

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <Users size={20} /> Unique Visitors
        </h2>
        {open ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Visitor ID</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total Views</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pages Visited</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visitors.map((v) => {
                const vid = v.visitor_id
                const isExpanded = expandedVisitors[vid]
                const details = isExpanded
                  ? visitorPageViews.filter(pv => pv.visitor_id === vid)
                  : []
                return (
                  <React.Fragment key={vid}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleVisitor(vid)}
                    >
                      <td className="px-6 py-3 text-sm text-gray-700 font-mono flex items-center gap-2">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                          : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                        {vid.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">{v.total_views}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">{v.pages_visited}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 text-right">
                        {v.last_seen
                          ? new Date(v.last_seen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '\u2014'}
                      </td>
                    </tr>
                    {isExpanded && details.map((d, i) => (
                      <tr key={`${vid}-${i}`} className="bg-gray-50/60">
                        <td className="px-6 pl-14 py-2 text-xs text-gray-500 font-mono">{d.page_path}</td>
                        <td className="px-6 py-2 text-xs text-gray-600 text-right">{d.views}</td>
                        <td className="px-6 py-2"></td>
                        <td className="px-6 py-2 text-xs text-gray-400 text-right">
                          {d.view_date
                            ? new Date(d.view_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : ''}
                        </td>
                      </tr>
                    ))}
                    {isExpanded && details.length === 0 && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={4} className="px-6 pl-14 py-2 text-xs text-gray-400">No page view details available</td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {visitors.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No visitor data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
