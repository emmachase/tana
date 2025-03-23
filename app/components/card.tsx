import React, { type FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useAnimation } from "motion/react";
import { disableScroll, enableScroll } from "~/lib/scroll";
import { cn } from "~/lib/utils";
import { Skeleton } from "./ui/skeleton";

const Backdrop: FC<{
  in: boolean;
  onClick?: () => void;
}> = (props) => {
  return (
    <div
      onClick={props.onClick}
      className={cn(
        "full-bleed fixed inset-0 z-10 bg-black/30",
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
  url?: string;
  type?: CardContentType;
  hide?: boolean;
}> = React.memo((props) => {
  const [imLoaded, setLoaded] = useState(false);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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
    const maxHeight = windowHeight * 0.9;
    let targetWidth = maxWidth;
    let targetHeight = maxWidth / aspectRatio;

    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = maxHeight * aspectRatio;
    }

    return {
      top: (windowHeight - targetHeight) / 2,
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

      if (cardRef.current) {
        // queueMicrotask(() => {
        const rect = cardRef.current!.getBoundingClientRect();
        console.log(rect.top, rect.left, rect.width, rect.height);
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
    <div className="relative h-full w-full overflow-hidden rounded-sm">
      {props.type === CardContentType.VIDEO ? (
        <video
          {...(isExpanded ? expandedContentProps : contentProps)}
          src={props.url + "#t=0.001"}
          ref={!isExpanded ? thumbImageRef : null}
          controls={isExpanded}
          className="absolute top-0 left-0 h-full w-full object-cover select-none"
        />
      ) : (
        <>
          <img
            {...contentProps}
            ref={!isExpanded ? thumbImageRef : null}
            className="absolute top-0 left-0 h-full w-full object-cover select-none"
          />
          {isExpanded && (
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
          "shadow-card hover:shadow-card-hover relative h-40 w-40 overflow-hidden rounded-xl transition-shadow duration-250",
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
          <Skeleton className="absolute top-0 left-0 h-full w-full" />
        )}
      </div>
      {(isExpanded || isClosing) &&
        portalRoot &&
        createPortal(
          <>
            <Backdrop in={!isClosing} onClick={handleClose} />
            <motion.div
              className={cn(
                "overflow-hidden rounded-xl",
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
          </>,
          portalRoot,
        )}
    </>
  );
});
