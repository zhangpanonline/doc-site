/**
 * 导航栏包装：保留官方 Navbar，追加一条滚动时滑入的「二级导航」。
 * 二级导航是独立 fixed 图层（见 src/components/SubNavbar.tsx 与 subnavbar.css），
 * 不参与官方 Navbar 的 DOM 结构，因此不必 eject 整个 Navbar 组件。
 */
import React from 'react';
import Navbar from '@theme-original/Navbar';
import SubNavbar from '@site/src/components/SubNavbar';

export default function NavbarWrapper(props: Record<string, unknown>) {
  return (
    <>
      <Navbar {...props} />
      <SubNavbar />
    </>
  );
}
