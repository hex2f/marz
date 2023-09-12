import { useContext } from "react";
import RouterContext from "./context";

export function useRouter() {
	return useContext(RouterContext)
}