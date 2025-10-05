"use client"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Flame, Thermometer, Snowflake, Waves } from "lucide-react"

interface DataPanelProps {
  lat: number
  lon: number
  onClose: () => void
}

export default function DataPanel({ lat, lon, onClose }: DataPanelProps) {
  const [regionData, setRegionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        console.log("[Debug] Fetching from /api/weather?lat=", lat, "&lon=", lon)
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, { method: "GET" })
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`API error: ${res.status} - ${errorText}`)
        }
        const data = await res.json()
        console.log("[Debug] Received data:", data)

        const parsed = {
          temperature: data.data?.find((d: any) => d.parameter === "t_2m:C")?.coordinates[0].dates[0].value ?? null,
          humidity: data.data?.find((d: any) => d.parameter === "relative_humidity_2m:p")?.coordinates[0].dates[0].value ?? null,
          precipitation: data.data?.find((d: any) => d.parameter === "precip_24h:mm")?.coordinates[0].dates[0].value ?? null,
          wind_speed: data.data?.find((d: any) => d.parameter === "wind_speed_10m:ms")?.coordinates[0].dates[0].value ?? null,
          fire_index: data.data?.find((d: any) => d.parameter === "fosberg_fire_weather_index:idx")?.coordinates[0].dates[0].value ?? null,
          heavy_rain_warning: data.data?.find((d: any) => d.parameter === "heavy_rain_warning_24h:idx")?.coordinates[0].dates[0].value ?? null,
          soil_moisture: data.data?.find((d: any) => d.parameter === "soil_moisture_index_-5cm:idx")?.coordinates[0].dates[0].value ?? null,
          ice_concentration: data.data?.find((d: any) => d.parameter === "sea_ice_concentration:p")?.coordinates[0].dates[0].value ?? null,
          ice_thickness: data.data?.find((d: any) => d.parameter === "sea_ice_thickness:m")?.coordinates[0].dates[0].value ?? null,
          sea_surface_temp: data.data?.find((d: any) => d.parameter === "t_sea_sfc:C")?.coordinates[0].dates[0].value ?? null,
          salinity: data.data?.find((d: any) => d.parameter === "salinity_0m:psu")?.coordinates[0].dates[0].value ?? null,
          surge_amplitude: data.data?.find((d: any) => d.parameter === "surge_amplitude:cm")?.coordinates[0].dates[0].value ?? null,
        }

        // Фильтрация некорректных значений
        if (parsed.soil_moisture && (parsed.soil_moisture < 0 || parsed.soil_moisture > 1)) parsed.soil_moisture = null;

        setRegionData(parsed)
      } catch (err: any) {
        console.error("[Debug] Fetch error:", err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (lat && lon) fetchData()
  }, [lat, lon])

  const getFireRiskLevel = (index: number | null) => {
    if (index === null || index === undefined || isNaN(index) || index < 0) return { level: "N/A", color: "text-muted-foreground" }
    if (index < 30) return { level: "Low", color: "text-green-500" }
    if (index < 60) return { level: "Medium", color: "text-yellow-500" }
    return { level: "High", color: "text-red-500" }
  }

  const getFloodRiskLevel = (rainWarning: number | null, moisture: number | null) => {
    if (rainWarning === null || moisture === null || isNaN(rainWarning) || isNaN(moisture) || moisture < 0 || moisture > 1) return { level: "N/A", color: "text-muted-foreground" }
    const riskScore = (rainWarning || 0) + (moisture || 0)
    if (riskScore > 2) return { level: "High", color: "text-red-500" }
    if (riskScore > 1) return { level: "Medium", color: "text-yellow-500" }
    return { level: "Low", color: "text-green-500" }
  }

  const { level: fireLevel, color: fireColor } = getFireRiskLevel(regionData?.fire_index)
  const { level: floodLevel, color: floodColor } = getFloodRiskLevel(regionData?.heavy_rain_warning, regionData?.soil_moisture)

  return (
    <div className="absolute top-0 right-0 w-full md:w-[480px] h-full bg-background/95 backdrop-blur-md border-l border-border overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Region Data</h2>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="font-mono">
                Lat: <span className="text-primary">{lat.toFixed(2)}°</span>
              </span>
              <span className="font-mono">
                Lon: <span className="text-primary">{lon.toFixed(2)}°</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="text-center text-muted-foreground py-10">Loading NASA & Meteomatics data...</div>
        )}
        {error && (
          <div className="text-center text-red-500 py-10">Error: {error}. Check coordinates or API status.</div>
        )}

        {!loading && regionData && (
          <Tabs defaultValue="climate" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="fires"><Flame className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="climate"><Thermometer className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="ice"><Snowflake className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="ocean"><Waves className="w-4 h-4" /></TabsTrigger>
            </TabsList>

            <TabsContent value="fires" className="space-y-4">
              <Card className="p-4 bg-card/50 border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Fire Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Active Fires</span>
                    <span className="font-mono font-semibold text-muted-foreground">N/A (NASA FIRMS pending)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Risk Level (Fosberg Index)</span>
                    <span className={`font-mono font-semibold ${fireColor}`}>
                      {fireLevel} {regionData.fire_index !== null && !isNaN(regionData.fire_index) ? `(${regionData.fire_index.toFixed(0)})` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Soil Moisture (contrib.)</span>
                    <span className="font-mono font-semibold text-foreground">
                      {regionData.soil_moisture !== null && !isNaN(regionData.soil_moisture) ? `${(regionData.soil_moisture * 100).toFixed(0)}%` : "N/A"}
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="climate" className="space-y-4">
              <Card className="p-4 bg-card/50 border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Thermometer className="w-5 h-5 text-blue-500" />
                  Climate Data
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Temperature</span>
                    <span className="font-mono font-semibold text-blue-500">
                      {regionData.temperature ?? "N/A"} °C
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Humidity</span>
                    <span className="font-mono font-semibold text-cyan-400">
                      {regionData.humidity ?? "N/A"} %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Precipitation (24h)</span>
                    <span className="font-mono font-semibold text-foreground">
                      {regionData.precipitation !== null ? regionData.precipitation.toFixed(1) : "N/A"} mm
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Wind speed</span>
                    <span className="font-mono font-semibold text-slate-400">
                      {regionData.wind_speed ?? "N/A"} m/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Flood Risk Level</span>
                    <span className={`font-mono font-semibold ${floodColor}`}>
                      {floodLevel}
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="ice" className="space-y-4">
              <Card className="p-4 bg-card/50 border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Snowflake className="w-5 h-5 text-blue-300" />
                  Ice Coverage
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Coverage</span>
                    <span className="font-mono font-semibold text-blue-300">
                      {regionData.ice_concentration !== null ? `${regionData.ice_concentration}%` : "N/A (polar regions only)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Thickness</span>
                    <span className="font-mono font-semibold text-foreground">
                      {regionData.ice_thickness !== null ? regionData.ice_thickness.toFixed(1) : "N/A (polar regions only)"} m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>10-Year Trend</span>
                    <span className="font-mono font-semibold text-green-500">Stable</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="ocean" className="space-y-4">
              <Card className="p-4 bg-card/50 border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Waves className="w-5 h-5 text-teal-500" />
                  Ocean Conditions
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Surface Temperature</span>
                    <span className="font-mono font-semibold text-teal-500">
                      {regionData.sea_surface_temp ?? "N/A (coastal regions only)"} °C
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Salinity</span>
                    <span className="font-mono font-semibold text-foreground">
                      {regionData.salinity ?? "N/A (coastal regions only)"} PSU
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sea Level Surge (risk)</span>
                    <span className={`font-mono font-semibold ${regionData.surge_amplitude > 50 ? "text-red-500" : "text-teal-500"}`}>
                      {regionData.surge_amplitude !== null ? (regionData.surge_amplitude / 100).toFixed(2) : "N/A (coastal regions only)"} m
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Data sourced from NASA Earth Observation systems including MODIS, Landsat, and VIIRS satellites. Images from Gateway to Astronaut Photography of Earth. Powered by Meteomatics API. Note: Ice and ocean data are limited to polar and coastal regions respectively.
          </p>
        </div>
      </div>
    </div>
  )
}