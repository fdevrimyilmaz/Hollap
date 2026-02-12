"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { creators, formatNumber } from "@/lib/data";

export function FeaturedCreators() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
              One Cikan Yaraticilar
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              En <span className="gradient-text">Populer</span> Yaraticilar
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Binlerce kisiye ilham veren uzmanlardan ogrenin. Her biri alaninda kanitmis profesyoneller.
            </p>
          </div>
          <Link href="/creators">
            <Button variant="outline" className="border-white/20 hover:bg-white/5">
              Tumunu Gor
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </Link>
        </div>

        {/* Creators Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              href={`/creator/${creator.username}`}
              className="group"
            >
              <div className="glass-card rounded-2xl overflow-hidden card-hover">
                {/* Cover Image */}
                <div className="relative h-32 overflow-hidden">
                  <Image
                    src={creator.coverImage}
                    alt={creator.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

                  {/* Category Badge */}
                  <Badge className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm border-0">
                    {creator.category}
                  </Badge>
                </div>

                {/* Content */}
                <div className="relative p-6 pt-0">
                  {/* Avatar */}
                  <div className="relative -mt-10 mb-4">
                    <Avatar className="w-20 h-20 border-4 border-background ring-2 ring-orange-500/50 group-hover:ring-orange-500 transition-all">
                      <AvatarImage src={creator.avatar} alt={creator.name} />
                      <AvatarFallback>{creator.name[0]}</AvatarFallback>
                    </Avatar>
                    {creator.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-bg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors mb-1">
                    {creator.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">@{creator.username}</p>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {creator.bio}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white font-medium">{formatNumber(creator.subscribers)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-white font-medium">{creator.rating}</span>
                      </div>
                    </div>

                    <div className="text-orange-500 font-semibold">
                      ${creator.subscriptionPrice}/ay
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
