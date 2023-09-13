import { createContext } from "react"

const RouterContext = createContext<{
	location: string
	refresh: (response: Response) => void
	navigate: (nextLocation: string) => void
}>({ location: "", refresh: () => {}, navigate: () => {} })

export default RouterContext
