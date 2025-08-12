import React, { useState } from "react";
import { Home, FileText, Plus, Calendar, Settings, ListChecks, Folder } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const menuItems = [
	{
		title: "Dashboard",
		url: "/",
		icon: Home,
	},
	{
		title: "All Invoices",
		url: "/invoices",
		icon: FileText,
	},
	{
		title: "Create Invoice",
		url: "/invoices/create",
		icon: Plus,
	},
	{
		title: "Price Comparison",
		url: "/price-comparison",
		icon: FileText,
  },
	{
		title: "Delivery Challan",
		url: "/delivery-challan",
		icon: FileText,
	},
	{
		title: "Bank Transactions",
		url: "/bank-transactions",
		icon: Calendar,
	},
	{
		title: "Letter",
		url: "/letter",
		icon: FileText,
	},
	{
		title: "Taxes", 
		url: "/tax", 
		icon: Calendar,
	},
	{
		title: "Purchases", 
		url: "/purchases", 
		icon: FileText,
	},
	{
		title: "Vendors",
		icon: Folder,
		submenu: [
			{
				title: "Vendors Invoices",
				url: "/vendors-invoices",
				icon: FileText,
			},
			{
				title: "Vendors Names",
				url: "/vendors-names",
				icon: FileText,
			},
			{
				title: "Vendors Items",
				url: "/vendors-items",
				icon: FileText,
			},
		],
	}
];


export function AppSidebar() {
	const location = useLocation();
	const [openMenu, setOpenMenu] = useState<string | null>(null);

	return (
		<Sidebar className="border-r border-gray-200">
			<SidebarHeader className="border-b border-gray-200 p-4">
				<div className="flex items-center gap-3">
					<img
						src="/lovable-uploads/7c42979b-5f85-450e-bf3a-6a13d572a552.png"
						alt="Veshad and Company Logo"
						className="h-12 w-auto"
					/>
					<div>
						<h2 className="text-lg font-bold text-blue-900">
							VESHAD AND COMPANY
						</h2>
						<p className="text-sm text-gray-600">Invoice Management</p>
					</div>
				</div>
				<SidebarTrigger className="ml-auto" />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="text-gray-700 font-medium">
						Navigation
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => (
								item.submenu ? (
									<SidebarMenuItem key={item.title}>
										<div>
											<SidebarMenuButton
												asChild
												isActive={item.submenu.some(sub => location.pathname === sub.url)}
												className="data-[active=true]:bg-blue-100 data-[active=true]:text-blue-900 hover:bg-blue-50"
												onClick={e => {
													e.preventDefault();
													setOpenMenu(openMenu === item.title ? null : item.title);
												}}
											>
												<div className="flex items-center gap-3 cursor-pointer select-none">
													<item.icon className="h-4 w-4" />
													<span>{item.title}</span>
													<span className="ml-auto">{openMenu === item.title ? '▾' : '▸'}</span>
												</div>
											</SidebarMenuButton>
											{openMenu === item.title && (
												<div className="ml-8 mt-2 flex flex-col gap-1">
													{item.submenu.map((sub) => (
														<Link
															key={sub.title}
															to={sub.url}
															className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-50 ${location.pathname === sub.url ? 'bg-blue-100 text-blue-900 font-semibold' : ''}`}
															onClick={e => setOpenMenu(item.title)}
														>
															<sub.icon className="h-3 w-3" />
															<span>{sub.title}</span>
														</Link>
													))}
												</div>
											)}
										</div>
									</SidebarMenuItem>
								) : (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											isActive={location.pathname === item.url}
											className="data-[active=true]:bg-blue-100 data-[active=true]:text-blue-900 hover:bg-blue-50"
										>
											<Link to={item.url} className="flex items-center gap-3">
												<item.icon className="h-4 w-4" />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
