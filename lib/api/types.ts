export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export type DataRequestResult<T> =
  | {
      status: "success";
      data: T | null;
    }
  | {
      status: "error";
    };

export interface PageInfo<T> {
  list: T[];
  pageNum: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
