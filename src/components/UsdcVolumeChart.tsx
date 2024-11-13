'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCwIcon } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// USDC contract address on Ethereum mainnet
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

// Type definition for raw transfer event data
interface Transfer {
  block_timestamp: number  // Unix timestamp of the block
  data: string            // Transfer amount data (not used in volume calculation)
}

// Type definition for processed volume data points
interface VolumeData {
  minute: string          // Time in HH:mm format
  volume: number          // Number of transfers in this minute
}

export function UsdcVolumeChart() {
  // State management
  const [volumeData, setVolumeData] = useState<VolumeData[]>([])
  const [loading, setLoading] = useState(true)        // Initial loading state
  const [isRefreshing, setIsRefreshing] = useState(false)  // Refresh loading state
  const [error, setError] = useState<string | null>(null)   // Error handling state

  // Fetch and process USDC transfer volume data
  const getVolumeData = async () => {
    try {
      // Reset states before fetching new data
      setIsRefreshing(true)
      setError(null)
      
      // Fetch last 5000 USDC transfers from thirdweb Insights API
      const response = await fetch(
        `https://1.insight.thirdweb.com/v1/${process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID}/events/${USDC_CONTRACT}/Transfer(address,address,uint256)?sort_by=block_number&sort_order=desc&limit=5000`
      )
      const data = await response.json()

      if (!data?.data?.length) {
        throw new Error('No transfer data received')
      }

      // Aggregate transfers by minute
      const volumeByMinute = data.data.reduce((acc: { [key: string]: number }, transfer: Transfer) => {
        // Convert Unix timestamp to milliseconds and create Date object
        const timestamp = transfer.block_timestamp * 1000
        const date = new Date(timestamp)
        
        // Format time as HH:mm using local time
        const minute = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        
        // Increment transfer count for this minute
        acc[minute] = (acc[minute] || 0) + 1
        return acc
      }, {} as { [key: string]: number })

      // Convert aggregated data to array format and sort chronologically
      const sortedData = Object.entries(volumeByMinute)
        .map(([minute, volume]) => ({
          minute,
          volume: volume as number
        }))
        .sort((a, b) => {
          // Sort by converting time strings to comparable values (minutes since midnight)
          const [aHour, aMin] = a.minute.split(':').map(Number)
          const [bHour, bMin] = b.minute.split(':').map(Number)
          return (aHour * 60 + aMin) - (bHour * 60 + bMin)
        })

      setVolumeData(sortedData)
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message)
    } finally {
      // Reset loading states
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    getVolumeData()
  }, [])

  return (
    <Card className="w-full h-[500px] flex flex-col">
      {/* Chart header with title and refresh button */}
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Total Transactions (per minute)</CardTitle>
        <button 
          onClick={getVolumeData} 
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCwIcon className="h-5 w-5" />}
        </button>
      </CardHeader>

      {/* Chart content with loading, error, and data states */}
      <CardContent className="flex-1">
        {loading ? (
          // Loading spinner
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          // Error message display
          <div className="text-sm text-red-500 mt-4">
            Error: {error}
          </div>
        ) : (
          // Bar chart visualization
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <XAxis 
                dataKey="minute" 
                tick={{ fontSize: 12 }}
                interval={Math.floor(volumeData.length / 10)} // Show approximately 10 ticks on X-axis
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={[0, 'auto']}  // Start Y-axis at 0, auto-scale to max value
              />
              <Tooltip 
                formatter={(value: number) => [`${value} transfers`, 'Count']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Bar 
                dataKey="volume" 
                fill="#3b82f6"    // Blue color for bars
                radius={[4, 4, 0, 0]}  // Rounded top corners
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
