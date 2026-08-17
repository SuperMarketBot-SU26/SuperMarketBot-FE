import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { getProduct, getAlternatives } from '../features/product'
import { getProductTypes } from '../features/product/api/productApi'
import { ProductInfoCard, ProductAlternativesList } from '../features/product'

export function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)
  const [productTypes, setProductTypes] = useState([])

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getProduct(Number(id))
      setProduct(data)
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải thông tin sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchAlternatives = useCallback(async () => {
    setLoadingAlternatives(true)
    try {
      const data = await getAlternatives(Number(id))
      setAlternatives(Array.isArray(data) ? data : [])
    } catch {
      setAlternatives([])
    } finally {
      setLoadingAlternatives(false)
    }
  }, [id])

  useEffect(() => {
    fetchProduct()
    fetchAlternatives()
    getProductTypes().then((list) => setProductTypes(Array.isArray(list) ? list : [])).catch(() => {})
  }, [fetchProduct, fetchAlternatives])

  if (loading) {
    return (
      <div className="min-h-screen bg-smb-surface">
        <Sidebar activeItem="Quản Lý Sản Phẩm" />
        <div className="pl-[260px] flex items-center justify-center min-h-screen">
          <span className="material-symbols-outlined animate-spin text-2xl text-smb-on-surface-variant">
            progress_activity
          </span>
          <span className="ml-2 text-sm text-smb-on-surface-variant">
            Đang tải thông tin sản phẩm...
          </span>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-smb-surface">
        <Sidebar activeItem="Quản Lý Sản Phẩm" />
        <div className="pl-[260px] flex flex-col items-center justify-center min-h-screen gap-4">
          <span className="material-symbols-outlined text-4xl text-smb-error">error</span>
          <p className="text-sm text-smb-error">{fetchError}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/products')}>
              Quay Lại
            </Button>
            <Button variant="secondary" onClick={fetchProduct}>
              Thử Lại
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Sản Phẩm" />

      <div className="pl-[260px]">
        <Navbar
          title="Chi Tiết Sản Phẩm"
          subtitle={product?.productName}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Back */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/products')}
                className="flex items-center gap-1 text-smb-on-surface-variant hover:text-smb-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Danh sách sản phẩm
              </button>
            </div>

            <ProductInfoCard product={{ ...product, productTypeName: productTypes.find(t => t.productTypeId === product?.productTypeId)?.typeName }} />

            <ProductAlternativesList
              alternatives={alternatives}
              loading={loadingAlternatives}
              onProductClick={(productId) => navigate(`/products/${productId}`)}
            />

            <div className="flex justify-end">
              <Button
                variant="secondary"
                icon="arrow_back"
                onClick={() => navigate('/products')}
              >
                Quay Lại Danh Sách
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProductDetail
