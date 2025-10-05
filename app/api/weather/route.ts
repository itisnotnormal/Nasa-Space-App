import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")

    if (!lat || !lon) {
      return NextResponse.json({ error: "Missing lat or lon parameters" }, { status: 400 })
    }

    console.log("[Debug] API request for lat=", lat, "lon=", lon)
    const username = process.env.METEOMATICS_USERNAME
    const password = process.env.METEOMATICS_PASSWORD
    if (!username || !password) {
      return NextResponse.json({ error: "Meteomatics credentials missing in .env" }, { status: 500 })
    }
    const auth = Buffer.from(`${username}:${password}`).toString("base64")

    const date = new Date().toISOString().split(".")[0] + "Z"

    const generalParams = "t_2m:C,relative_humidity_2m:p,precip_24h:mm,wind_speed_10m:ms,fosberg_fire_weather_index:idx,heavy_rain_warning_24h:idx,soil_moisture_index_-5cm:idx"
    const generalUrl = `https://api.meteomatics.com/${date}/${generalParams}/${lat},${lon}/json`

    const generalRes = await fetch(generalUrl, { headers: { Authorization: `Basic ${auth}` } })
    if (!generalRes.ok) {
      const text = await generalRes.text()
      console.error("Meteomatics general API error:", generalRes.status, text)
      return NextResponse.json({ error: text }, { status: generalRes.status })
    }
    const generalJson = await generalRes.json()

    const oceanParams = "t_sea_sfc:C,salinity_0m:psu,sea_ice_concentration:p,sea_ice_thickness:m,surge_amplitude:cm"
    const oceanUrl = `https://api.meteomatics.com/${date}/${oceanParams}/${lat},${lon}/json?model=ecmwf-cmems`

    let oceanJson = { data: [] }
    const oceanRes = await fetch(oceanUrl, { headers: { Authorization: `Basic ${auth}` } })
    if (oceanRes.ok) {
      oceanJson = await oceanRes.json()
    } else {
      const text = await oceanRes.text()
      console.warn("Meteomatics ocean API warning:", oceanRes.status, text)
    }

    const combinedData = {
      ...generalJson,
      data: [...generalJson.data, ...oceanJson.data]
    }

    console.log("[Debug] API response:", combinedData)
    return NextResponse.json(combinedData)
  } catch (error: any) {
    console.error("Route error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}