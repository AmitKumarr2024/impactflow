"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/authSlice";
import { restoreCurrentProject } from "@/store/projectSlice";
import { api } from "@/lib/api";

/** Runs once at app root: if a token is stored, validate it against the
 * backend and restore the session; otherwise leave the user logged out. */
export function useAuthBootstrap() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    dispatch(restoreCurrentProject());
    const token = api.getToken();
    if (!token) {
      setChecked(true);
      return;
    }
    dispatch(fetchCurrentUser()).finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checked, status };
}
