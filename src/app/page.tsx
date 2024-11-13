import { TopUsdcWallets } from "@/components/TopUsdcWallets"
import { UsdcTransferChart } from "@/components/UsdcTransferChart"
import { UsdcTransfers } from "@/components/UsdcTransfers"
import { UsdcVolumeChart } from "@/components/UsdcVolumeChart"

export default function Home() {
  return (
    <div className="space-y-4 py-10">
      <div className="flex flex-row items-start justify-center container mx-auto space-x-4">
        <div className="h-[400px] w-full">
          <UsdcTransferChart />
        </div>
        <div className="h-[400px] w-full">
          <UsdcTransfers />
        </div>
      </div>
      <div className="flex flex-row items-start justify-center container mx-auto space-x-4">
        <div className="h-[400px] w-full">
          <TopUsdcWallets />
        </div>
        <div className="h-[400px] w-full">
          <UsdcVolumeChart />
        </div>
      </div>
    </div>
    
  )
}