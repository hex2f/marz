"use client"

import React from "react"
import Router from "./router/router"
import { createRoot } from "react-dom/client"

function MarzMount() {
	return <Router />
}

const root = createRoot(document.getElementById("__MARZ_MOUNT"))
root.render(<MarzMount />)
