'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2, RefreshCwIcon } from "lucide-react"

// USDC contract address on Ethereum mainnet
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

// Type definitions for the raw transfer event data from the API
interface TransferEvent {
  block_timestamp: number  // Unix timestamp of the block
  data: string            // Contains the transfer amount in hex
  topics: string[]        // Event topics (includes from/to addresses)
}

// Type definition for processed chart data points
interface ChartData {
  timestamp: string       // Formatted time string (HH:mm)
  amount: number         // Transfer amount in USDC
}

export function UsdcTransferChart() {
  // State management for chart data and UI states
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getUsdcTransfers = async () => {
    try {
      // Reset states before fetching new data
      setIsRefreshing(true)
      setError(null)
      
      // Fetch USDC transfer events from thirdweb Insights API
      const apiUrl = `https://1.insight.thirdweb.com/v1/${process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID}/events/${USDC_CONTRACT}/Transfer(address,address,uint256)?sort_by=block_number&sort_order=desc&limit=2500`
      
      console.log('Fetching from URL:', apiUrl)

      const response = await fetch(apiUrl)
      const data = await response.json()
      console.log('Raw API Response:', data)

      if (!data?.data?.length) {
        throw new Error('No transfer data received')
      }

      // Process and format transfer data for the chart
      const formattedData = data.data
        .map((event: TransferEvent) => {
          // Convert Unix timestamp to Date object
          const timestamp = new Date(event.block_timestamp * 1000)
          // Convert hex amount to decimal and adjust for USDC decimals (6)
          const amount = parseInt(event.data.slice(2), 16) / 1e6

          return {
            // Format timestamp to minute precision in 24-hour format
            timestamp: timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            amount: Number(amount.toFixed(2))
          }
        })
        // Aggregate transfers by minute
        .reduce((acc: ChartData[], curr: ChartData) => {
          const existingEntry = acc.find(item => item.timestamp === curr.timestamp)
          if (existingEntry) {
            existingEntry.amount += curr.amount
          } else {
            acc.push(curr)
          }
          return acc
        }, [])
        // Sort data points chronologically
        .sort((a: ChartData, b: ChartData) => {
          return new Date('1970/01/01 ' + a.timestamp).getTime() - 
                 new Date('1970/01/01 ' + b.timestamp).getTime()
        })

      console.log('Formatted chart data:', formattedData)
      setChartData(formattedData)
    } catch (error: any) {
      // Handle and display any errors
      console.error('Error fetching data:', error)
      setError(error.message)
    } finally {
      // Reset loading states
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    getUsdcTransfers()
  }, [])

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>USDC Volume (per minute)</CardTitle>
        <button 
          onClick={getUsdcTransfers} 
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCwIcon className="h-5 w-5" />}
        </button>
        {error && (
          <div className="text-sm text-red-500 mt-2">
            Error: {error}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center">
              <p>Loading transfer data...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <p>No transfer data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  interval="preserveEnd"
                  minTickGap={30} // Prevent X-axis label overcrowding
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} // Format Y-axis in millions
                />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value.toLocaleString()} USDC`, 
                    'Transfer Amount'
                  ]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#2775CA" // USDC brand color
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
