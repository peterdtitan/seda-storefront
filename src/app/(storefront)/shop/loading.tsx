import { LoadingScreen, Skeleton } from "@/components/ui/Skeleton";

import s from "./shop.module.css";

export default function ShopLoading() {
  return (
    <LoadingScreen label="Loading the drop">
      <Skeleton height="260px" />
      <div className={s.body}>
        <div className={s.filters}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height="36px" width="92px" />
          ))}
        </div>
        <div className={s.grid}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <Skeleton height="300px" />
              <Skeleton height="14px" width="70%" className={s.skeletonLine} />
              <Skeleton height="12px" width="45%" className={s.skeletonLine} />
            </div>
          ))}
        </div>
      </div>
    </LoadingScreen>
  );
}
