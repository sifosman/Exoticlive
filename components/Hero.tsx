'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    image: '/placeholder.svg?height=800&width=1600',
    title: 'Luxury Footwear Collection',
    description: 'Discover our exquisite range of premium shoes',
    cta: 'Shop Now'
  },
  {
    image: '/placeholder.svg?height=800&width=1600',
    title: 'Handcrafted Excellence',
    description: 'Experience the pinnacle of shoe craftsmanship',
    cta: 'Explore'
  },
  {
    image: '/placeholder.svg?height=800&width=1600',
    title: 'Exclusive Limited Editions',
    description: 'Be the first to own our latest designer collaborations',
    cta: 'View Collection'
  }
]

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide - 1 + slides.length) % slides.length)
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            layout="fill"
            objectFit="cover"
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
            <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
            <p className="text-xl mb-8">{slide.description}</p>
            <Button size="lg" className="bg-white text-black hover:bg-gray-200">
              {slide.cta}
            </Button>
          </div>
        </div>
      ))}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white bg-opacity-50 p-2 rounded-full"
      >
        <ChevronLeft className="w-6 h-6 text-black" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white bg-opacity-50 p-2 rounded-full"
      >
        <ChevronRight className="w-6 h-6 text-black" />
      </button>
    </div>
  )
}