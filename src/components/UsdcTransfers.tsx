'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, RefreshCwIcon } from "lucide-react"

// USDC contract address on Ethereum mainnet - used for fetching transfer events
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

// Type definition for USDC transfer events from the API
interface Transfer {
  block_timestamp: number  // Unix timestamp of the block
  transaction_hash: string // Transaction hash
  data: string            // Contains the transfer amount in hex
  topics: string[]        // Array containing event signature and encoded parameters (from/to addresses)
}

export function UsdcTransfers() {
  // State management
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)        // Loading state for initial data fetch
  const [isRefreshing, setIsRefreshing] = useState(false)  // Loading state for manual refresh

  // Fetch USDC transfer data from the API
  const getUsdcTransfers = async () => {
    try {
      setIsRefreshing(true)
      // Fetch the 10 most recent USDC transfers
      const response = await fetch(
        `https://1.insight.thirdweb.com/v1/${process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID}/events/${USDC_CONTRACT}/Transfer(address,address,uint256)?sort_by=block_number&sort_order=desc&limit=10`
      )
      const data = await response.json()
      
      // Sort transfers by amount in descending order
      const sortedTransfers = data.data.sort((a: Transfer, b: Transfer) => {
        const amountA = parseInt(a.data.slice(2), 16) / 1e6  // Convert hex to decimal and adjust for USDC decimals
        const amountB = parseInt(b.data.slice(2), 16) / 1e6
        return amountB - amountA
      })
      
      setTransfers(sortedTransfers)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Helper function to decode Ethereum address from event topic
  // Removes padding and adds 0x prefix
  const decodeAddress = (topic: string) => {
    return `0x${topic.slice(26)}`
  }

  // Helper function to decode transfer amount from event data
  // Converts hex to decimal and adjusts for USDC's 6 decimal places
  const decodeAmount = (data: string) => {
    const hex = data.slice(2) // Remove '0x' prefix
    return (parseInt(hex, 16) / 1e6).toFixed(2) // Convert from hex and divide by 1e6 for USDC decimals
  }

  // Fetch transfers on component mount
  useEffect(() => {
    getUsdcTransfers()
  }, [])

  return (
    <Card className="w-full h-full overflow-y-auto">
      {/* Card header with title and refresh button */}
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Latest USDC Transfers</CardTitle>
        <button 
          onClick={getUsdcTransfers} 
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCwIcon className="h-5 w-5" />}
        </button>
      </CardHeader>

      {/* Transfer data table */}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount (USDC)</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton UI while data is being fetched
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                </TableRow>
              ))
            ) : (
              // Render transfer data
              transfers.map((transfer, index) => (
                <TableRow key={index}>
                  {/* Display truncated addresses for better UI */}
                  <TableCell className="font-mono">
                    {decodeAddress(transfer.topics[1]).slice(0, 6)}...
                    {decodeAddress(transfer.topics[1]).slice(-4)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {decodeAddress(transfer.topics[2]).slice(0, 6)}...
                    {decodeAddress(transfer.topics[2]).slice(-4)}
                  </TableCell>
                  <TableCell>
                    {decodeAmount(transfer.data)}
                  </TableCell>
                  <TableCell>
                    {new Date(transfer.block_timestamp * 1000).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}