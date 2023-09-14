"use client"

import React from "react"
import { hydrateRoot } from "react-dom/client"
import Router from "./router"

function MarzMount() {
	return <Router />
}

hydrateRoot(document.getElementById("__MARZ_MOUNT"), <MarzMount />)
