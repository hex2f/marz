"use client"

import React from "react"
import { createRoot } from "react-dom/client"
import Router from "./router/router"

function MarzMount() {
	return <Router />
}

const root = createRoot(document.getElementById("__MARZ_MOUNT"))
root.render(<MarzMount />)
