'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, RefreshCwIcon } from "lucide-react"

// USDC Contract address on Ethereum mainnet
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

// Types for Transfer event data structure
interface TransferEvent {
  block_timestamp: number
  data: string        // Contains the transfer amount in hex
  topics: string[]    // Contains from/to addresses in topics[1] and topics[2]
}

// Structure for aggregated wallet statistics
interface WalletSummary {
  address: string
  totalAmount: number      // Total USDC volume
  transferCount: number    // Number of transfers
  averageAmount: number    // Average amount per transfer
}

export function TopUsdcWallets() {
  const [walletStats, setWalletStats] = useState<WalletSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTopWallets = async () => {
    try {
      // Reset states before fetching new data
      setIsRefreshing(true)
      setError(null)
      
      // Fetch recent USDC transfer events from thirdweb
      const apiUrl = `https://1.insight.thirdweb.com/v1/${process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID}/events/${USDC_CONTRACT}/Transfer(address,address,uint256)?sort_by=block_number&sort_order=desc&limit=2500`
      
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (!data?.data?.length) {
        throw new Error('No transfer data received')
      }

      // Process transfers and aggregate by wallet
      const walletMap = new Map<string, WalletSummary>()

      data.data.forEach((event: TransferEvent) => {
        // Convert hex amount to decimal and adjust for USDC decimals (6)
        const amount = parseInt(event.data.slice(2), 16) / 1e6
        // Extract addresses from topics (remove padding and add 0x prefix)
        const fromAddress = `0x${event.topics[1].slice(26)}`
        const toAddress = `0x${event.topics[2].slice(26)}`

        // Update statistics for sending wallet
        if (!walletMap.has(fromAddress)) {
          walletMap.set(fromAddress, { 
            address: fromAddress, 
            totalAmount: 0, 
            transferCount: 0,
            averageAmount: 0
          })
        }
        const fromWallet = walletMap.get(fromAddress)!
        fromWallet.totalAmount += amount
        fromWallet.transferCount += 1
        fromWallet.averageAmount = fromWallet.totalAmount / fromWallet.transferCount

        // Update statistics for receiving wallet
        if (!walletMap.has(toAddress)) {
          walletMap.set(toAddress, { 
            address: toAddress, 
            totalAmount: 0, 
            transferCount: 0,
            averageAmount: 0
          })
        }
        const toWallet = walletMap.get(toAddress)!
        toWallet.totalAmount += amount
        toWallet.transferCount += 1
        toWallet.averageAmount = toWallet.totalAmount / toWallet.transferCount
      })

      // Sort wallets by volume and get top 10
      const sortedWallets = Array.from(walletMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)

      setWalletStats(sortedWallets)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    getTopWallets()
  }, [])

  return (
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Top Volume (by wallet)</CardTitle>
        <button 
          onClick={getTopWallets}
          className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCwIcon className="h-5 w-5" />}
        </button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wallet</TableHead>
              <TableHead>Total Volume (USDC)</TableHead>
              <TableHead>Transfers</TableHead>
              <TableHead>Avg. Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                </TableRow>
              ))
            ) : (
              walletStats.map((wallet, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </TableCell>
                  <TableCell>
                    {wallet.totalAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell>{wallet.transferCount}</TableCell>
                  <TableCell>
                    {wallet.averageAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {error && (
          <div className="text-sm text-red-500 mt-4">
            Error: {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

