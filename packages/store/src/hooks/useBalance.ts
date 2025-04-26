import { useAtomValue } from "jotai";
import { balanceAtom } from "../atoms/balanceAtom";

export const useBalance = () => {
  const balance = useAtomValue(balanceAtom);
  return balance;
};
