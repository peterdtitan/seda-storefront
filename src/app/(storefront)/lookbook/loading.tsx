import { LoadingScreen, Skeleton } from "@/components/ui/Skeleton";

import s from "./lookbook.module.css";

export default function LookbookLoading() {
  return (
    <LoadingScreen label="Loading the lookbook">
      <header className={s.header}>
        <Skeleton height="12px" width="120px" />
        <Skeleton height="46px" width="260px" className={s.skeletonTitle} />
      </header>
      <div className={s.feature}>
        <Skeleton height="520px" />
        <div className={s.support}>
          <Skeleton height="250px" />
          <Skeleton height="250px" />
        </div>
      </div>
    </LoadingScreen>
  );
}
