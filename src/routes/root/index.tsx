import { Outlet, Navigate, useLocation } from 'react-router-dom'

import { LICEX_MARKETPLACE_PATH, ROOT_PATH } from '../../app/router/paths'
import { Layout } from '../../components/Layout'

export const RootRoute = () => {
  const location = useLocation()
  const isIndexRoute = location.pathname === ROOT_PATH

  // The welcome (account picker + connect) lives on the wallet-setup
  // screen, which is always the entry point. "/" simply forwards there.
  if (isIndexRoute) {
    return <Navigate replace to={LICEX_MARKETPLACE_PATH} />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
