import React, { type FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimation } from "motion/react";
import { disableScroll, enableScroll } from "~/lib/scroll";
import { cn } from "~/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Download, Info, Share, X } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

const Backdrop: FC<{
  in: boolean;
  onClick?: () => void;
}> = (props) => {
  return (
    <div
      onClick={props.onClick}
      className={cn(
        "full-bleed fixed inset-0 z-50 bg-black/60",
        props.in ? "animate-fade-in visible" : "pointer-events-none opacity-0",
      )}
    />
  );
};

export enum CardContentType {
  IMAGE,
  VIDEO,
}

export const Card: FC<{
  id?: number;
  url?: string;
  type?: CardContentType;
  hide?: boolean;
}> = React.memo((props) => {
  const [imLoaded, setLoaded] = useState(false);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [actionBarVisible, setActionBarVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const thumbImageRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const controls = useAnimation();
  const portalRoot = typeof document !== "undefined" ? document.body : null;

  // Calculate the position and size for the expanded animation
  const getExpandedStyle = () => {
    if (!thumbImageRef.current)
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };

    const img = thumbImageRef.current;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Calculate dimensions that maintain aspect ratio and fill most of the screen
    const aspectRatio =
      img instanceof HTMLImageElement
        ? img.naturalWidth / img.naturalHeight
        : (img as HTMLVideoElement).videoWidth /
          (img as HTMLVideoElement).videoHeight;

    const maxWidth = windowWidth * 0.9;
    // Reserve space for action bar (60px height + some padding)
    const actionBarHeight = 70;
    const maxHeight = windowHeight * 0.9 - actionBarHeight;
    let targetWidth = maxWidth;
    let targetHeight = maxWidth / aspectRatio;

    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = maxHeight * aspectRatio;
    }

    return {
      top: (windowHeight - targetHeight - actionBarHeight) / 2,
      left: (windowWidth - targetWidth) / 2,
      width: targetWidth,
      height: targetHeight,
    };
  };

  useEffect(() => {
    if (isExpanded) {
      disableScroll();
      const handleResize = () => {
        controls.start(getExpandedStyle());
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        enableScroll();
      };
    } else {
      enableScroll();
    }
    return () => enableScroll();
  }, [isExpanded, controls]);

  // Show action bar when image is expanded (no delay)
  useEffect(() => {
    if (isExpanded && !isClosing) {
      // Show immediately when expanded
      setActionBarVisible(true);
    } else if (!isExpanded || isClosing) {
      setActionBarVisible(false);
    }
  }, [isExpanded, isClosing]);

  const onImageLoad = () => {
    setLoaded(true);
  };

  const onFullImageLoad = () => {
    setFullImageLoaded(true);
  };

  const contentProps = {
    src: props.url ? props.url + "?size=200" : undefined,
    draggable: false,
    hidden: !imLoaded,
    onLoad: onImageLoad,
    onCanPlay: onImageLoad,
  };

  const expandedContentProps = {
    draggable: false,
    src: props.url,
    hidden: false,
    onLoad: onFullImageLoad,
    onCanPlay: onFullImageLoad,
  };

  const [initialValues, setInitialValues] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  const handleClick = () => {
    if (!imLoaded || !props.url) return;
    if (!isExpanded) {
      setIsExpanded(true);
      setFullImageLoaded(false);
      setActionBarVisible(false);

      if (cardRef.current) {
        // queueMicrotask(() => {
        const rect = cardRef.current!.getBoundingClientRect();
        // First animate from the card's current position
        setInitialValues({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          opacity: 1,
          // transition: { duration: 0 },
        });
        // Then animate to the expanded position
        queueMicrotask(() => {
          controls.start(getExpandedStyle());
        });
      }
    }
  };

  const handleClose = () => {
    if (!cardRef.current) return;
    setIsClosing(true);
    setActionBarVisible(false);

    const rect = cardRef.current.getBoundingClientRect();
    controls
      .start({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        transition: {
          type: "spring",
          damping: 40,
          stiffness: 600,
        },
      })
      .then(() => {
        setIsExpanded(false);
        setIsClosing(false);
      });
  };

  const renderContent = (isExpanded = false) => (
    <div className="relative h-full w-full overflow-hidden md:rounded-sm">
      {props.type === CardContentType.VIDEO && isExpanded && !isClosing ? (
        <>
          <video
            {...expandedContentProps}
            src={props.url + "#t=0.001"}
            autoPlay={true}
            controls={true}
            className="absolute top-0 left-0 h-full w-full object-cover select-none"
          />
          <img
            {...contentProps}
            ref={!isExpanded ? thumbImageRef : null}
            className="absolute top-0 left-0 h-full w-full object-cover select-none"
            style={{ display: fullImageLoaded ? "none" : "block" }}
          />
        </>
      ) : (
        <>
          <img
            {...contentProps}
            ref={!isExpanded ? thumbImageRef : null}
            className="absolute top-0 left-0 h-full w-full object-cover select-none"
          />
          {isExpanded && props.type !== CardContentType.VIDEO && (
            <img
              {...expandedContentProps}
              className="absolute top-0 left-0 h-full w-full object-cover select-none"
              style={{ display: fullImageLoaded ? "block" : "none" }}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          "shadow-card hover:shadow-card-hover relative h-24 w-24 overflow-hidden transition-shadow duration-250 md:h-40 md:w-40 md:rounded-xl",
          imLoaded && props.url && "cursor-pointer",
        )}
        onClick={handleClick}
        style={{
          visibility: props.hide ? "hidden" : "visible",
          opacity: isExpanded || isClosing ? 0 : 1,
        }}
      >
        {renderContent()}
        {!imLoaded && (
          <Skeleton className="absolute top-0 left-0 h-full w-full rounded-none" />
        )}
      </div>
      {(isExpanded || isClosing) &&
        portalRoot &&
        createPortal(
          <>
            <Backdrop in={!isClosing} onClick={handleClose} />
            <motion.div
              className={cn(
                "overflow-hidden md:rounded-xl",
                isClosing ? "" : "shadow-card-hover",
              )}
              style={{
                position: "fixed",
                zIndex: isClosing ? 0 : 1000,
              }}
              initial={initialValues}
              animate={controls}
              transition={{
                type: "spring",
                damping: 40,
                stiffness: 600,
              }}
            >
              {renderContent(true)}
            </motion.div>
            <AnimatePresence>
              {actionBarVisible && (
                <motion.div
                  className="fixed bottom-0 left-0 z-[1001] flex w-full items-center justify-center gap-4 bg-black/80 py-4 backdrop-blur-sm"
                  initial={{ opacity: 0, bottom: -60 }}
                  animate={{ opacity: 1, bottom: 0 }}
                  exit={{ opacity: 0, bottom: -60 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 sm:w-auto sm:px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle download
                      if (props.url) {
                        window.open(props.url, "_blank");
                      }
                    }}
                  >
                    <Download className="h-5 w-5" />
                    <span className="ml-2 hidden sm:inline">Download</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 sm:w-auto sm:px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle share
                      if (props.url) {
                        navigator.clipboard.writeText(props.url);
                        toast.success("Link copied to clipboard");
                      }
                    }}
                  >
                    <Share className="h-5 w-5" />
                    <span className="ml-2 hidden sm:inline">Share</span>
                  </Button>
                  <Link
                    to={`/detail/${props.id}`}
                    onClick={(e: React.MouseEvent) => {
                      if (!props.url) {
                        e.preventDefault();
                      }
                      e.stopPropagation();
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 sm:w-auto sm:px-4"
                    >
                      <Info className="h-5 w-5" />
                      <span className="ml-2 hidden sm:inline">Details</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 sm:w-auto sm:px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                  >
                    <X className="h-5 w-5" />
                    <span className="ml-2 hidden sm:inline">Close</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          portalRoot,
        )}
    </>
  );
});
